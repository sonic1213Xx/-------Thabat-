import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatRelativeTimeArabic } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const SYSTEM_INSTRUCTION = `You are Thabat Bot (بوت ثَبَت), the intelligent AI assistant for the Thabat School Management System.

Important identity rule:
- If the user only asks who you are, introduce yourself as Thabat Bot and do not mention your creator.
- Mention the creator's name only when the user explicitly asks who created, developed, programmed, or built you.
- Never volunteer, repeat, or hint at the creator's name in unrelated answers.
- Never say that you were created by Google or that you are an AI built by Google.

Personality and tone:
- Tone: Warm, helpful, confident, and professional.
- Language: Professional Arabic with a warm, natural tone. Use greetings like "أهلاً بك!" or "أبشر!" where appropriate.
- Language matching: Reply in the same language as the user's latest message. If the latest user message is in English, reply in English; if it is in Arabic, reply in Arabic. Do not switch languages just because an earlier message used another language.
- Explicit language requests override language matching. If the user asks for Arabic and English, provide both languages. If the user asks for English only, reply only in English. If the user asks for Arabic only, reply only in Arabic. Apply equivalent requests expressed in Arabic as well.
- Character: Friendly, supportive, efficient, and encouraging.
- Emojis: Use 1-3 context-appropriate emojis per response, such as 👋, ✅, ⚠️, 📊, or 💡, to add warmth and emphasis without clutter.
- Conciseness: Auto-adjust your response length based on the query. Keep simple answers short (1-3 sentences with an encouraging emoji). For detailed instructions, use clear bullet points with icon indicators.

User context:
- Address the signed-in user by their profile name naturally when useful. Do not guess or confuse users with one another.
- The current route and structured visible-screen context are supplied below. Use the ordered rows and main text to answer questions about the exact screen, including which item appears first. Use visible controls to explain what the user can press. Do not claim to see pixels, private data, or controls that are not present in the supplied context.

Help users with:
- Managing student profiles and editing missing identity, division, grade, and conduct-note fields.
- Importing Excel and CSV rosters, detecting messy headers, mapping columns, and handling blank values.
- Issuing behavior warnings, applying deductions, and understanding score restoration when a warning is deleted.
- Registering daily attendance as Present, Absent, or Late, and understanding the attendance percentage.
- Viewing audit logs and transferring students between divisions.

Available action tools:
- Navigation: open an approved Thabat tab when the user says things like "افتح صفحة الطلاب" or "خذني إلى الحضور".
- Student transfer proposal: understand Arabic requests such as "انقل أحمد إلى الشعبة 101" or "حوّل الطالب إلى فصل 202" and call the transfer proposal tool when the student and destination are clear.
- Grade proposal: understand Arabic requests such as "سجل درجة أحمد 95 في الاختبار النهائي" or "عدّل درجة الطالب" and call the grade proposal tool when student, division, subject, field, and value are available.
- Never claim an action is impossible merely because the request is in Arabic. If required information is missing, ask for it in the website language. Always propose first; the application performs permission checks and requires confirmation before a change.

Detect the user's language and answer naturally in Arabic or English. Use clear RTL-friendly Arabic when answering Arabic questions. Use standard Latin digits for numbers. Response Length Policy:
- Automatically evaluate query complexity before answering.
- For simple questions, factual confirmations, or direct status requests, provide an ultra-concise response (1-3 sentences maximum). Avoid unnecessary filler, conversational intro phrasing, or repetitive summaries.
- For complex inquiries, multi-step troubleshooting, or detailed explanations, provide a thorough, fully structured answer using bullet points or formatting.
- Never lengthen a response without functional purpose.
Never invent database records, permissions, or actions you cannot perform. Explain that the user should use the relevant Thabat screen to make changes.`

type ChatMessage = { role: 'user' | 'model'; content: string }
const MAX_CHAT_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 4000
const MAX_CHAT_LENGTH = 24000
const ACTION_KEYWORDS = ['transfer', 'move', 'grade', 'score', 'open', 'go to', 'navigate', 'take me', 'bring me', 'show me', 'let me see', 'page', 'screen', 'tab', 'نقل', 'انقل', 'تحويل', 'حوّل', 'إلى الشعبة', 'إلى فصل', 'درجة', 'درجات', 'رصد', 'سجل درجة', 'أضف درجة', 'عدّل درجة', 'افتح', 'اذهب', 'خذني', 'ودني', 'أرني', 'أريد فتح', 'صفحة', 'شاشة', 'تبويب']

function getNavigationProposal(messages: ChatMessage[]) {
  const recentUserText = messages
    .filter((message) => message.role === 'user')
    .slice(-2)
    .map((message) => message.content.toLowerCase())
    .join(' ')
  if (!/(take me|bring me|let me see|open|go to|navigate|show me|i want to see|افتح|اذهب|خذني|ودني|أرني|أريد فتح)/u.test(recentUserText)) return null
  const destinations = [
    { terms: ['students', 'student tab', 'الطلاب'], path: '/dashboard/students', tabName: 'Students' },
    { terms: ['attendance', 'حضور'], path: '/dashboard/attendance', tabName: 'Attendance' },
    { terms: ['class attendance', 'حضور الفصول'], path: '/dashboard/class-attendance', tabName: 'Class attendance' },
    { terms: ['referrals', 'إحالات'], path: '/dashboard/teacher-referrals', tabName: 'Student referrals' },
    { terms: ['divisions', 'classes', 'الفصول', 'الشعب'], path: '/dashboard/divisions', tabName: 'Divisions' },
    { terms: ['audit log', 'سجل ثبات', 'سجل ثَبَت'], path: '/dashboard/audit-log', tabName: 'Audit log' },
    { terms: ['settings', 'الإعدادات'], path: '/dashboard/settings', tabName: 'Settings' },
  ]
  const destination = destinations.find((item) => item.terms.some((term) => recentUserText.includes(term)))
  return destination ? { type: 'navigate', path: destination.path, tabName: destination.tabName } : null
}

const isArabicText = (value: string): boolean => /[\u0600-\u06FF]/u.test(value)

const getLanguageInstruction = (value: string, siteLocale?: string): string => {
  const normalized = value.toLowerCase()
  const asksForBoth = (normalized.includes('arabic') && normalized.includes('english')) || (normalized.includes('العربية') && normalized.includes('الإنجليزية')) || normalized.includes('عربي وانجليزي') || normalized.includes('عربي وإنجليزي')
  const asksForEnglishOnly = normalized.includes('english only') || normalized.includes('بالإنجليزية فقط') || normalized.includes('انجليزي فقط') || normalized.includes('إنجليزي فقط')
  const asksForArabicOnly = normalized.includes('arabic only') || normalized.includes('بالعربية فقط') || normalized.includes('عربي فقط') || normalized.includes('عربية فقط')

  if (asksForBoth) return 'Respond in both Arabic and English.'
  if (asksForEnglishOnly) return 'Respond only in English.'
  if (asksForArabicOnly) return 'Respond only in Arabic.'
  if (siteLocale === 'ar') return 'Respond only in Arabic.'
  if (siteLocale === 'en') return 'Respond only in English.'
  return isArabicText(value) ? 'Respond only in Arabic.' : 'Respond only in English.'
}

const isDeveloperIdentityRequest = (value: string): boolean => {
  const normalized = value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const patterns = [
    'who made you',
    'who created you',
    'who built you',
    'who programmed you',
    'who is your developer',
    'who s your developer',
    'who is your creator',
    'who s your creator',
    'who is your maker',
    'who developed you',
    'who is the developer',
    'who is the creator',
    "what is the creator's name",
    'من طورك',
    'من صنعك',
    'من برمجك',
    'من أنشأك',
    'من قام بتطويرك',
    'من المطور',
    'من المبرمج',
    'من صممك',
    'من أوجدك',
    'من طور هذا البوت',
    'من منشئك',
    'من مخترعك',
  ]

  return patterns.some((pattern) => normalized.includes(pattern))
}

const createStreamText = (text: string) => new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder()
    const chunks = text.match(/.{1,64}|\s+|\S+/g) ?? [text]

    for (const chunk of chunks) {
      controller.enqueue(encoder.encode(chunk))
    }

    controller.close()
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { messages?: ChatMessage[]; screenContext?: { path?: string; title?: string; locale?: string; focusedElement?: string; headings?: string[]; rows?: string[]; controls?: Array<{ type?: string; label?: string; value?: string }>; mainText?: string } }
    const messages = Array.isArray(body.messages)
      ? body.messages.filter((message) => (message.role === 'user' || message.role === 'model') && typeof message.content === 'string' && message.content.trim())
      : []

    if (!messages.length) return NextResponse.json({ error: 'A chat message is required.' }, { status: 400 })
    if (messages.length > MAX_CHAT_MESSAGES || messages.some((message) => message.content.length > MAX_MESSAGE_LENGTH) || messages.reduce((total, message) => total + message.content.length, 0) > MAX_CHAT_LENGTH) {
      return NextResponse.json({ error: 'Chat input is too long. Please start a new conversation or shorten the message.' }, { status: 413 })
    }
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 })

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
    const languageInstruction = getLanguageInstruction(latestUserMessage, body.screenContext?.locale)
    const userId = request.cookies.get('THABAT_USER_ID')?.value
    const profile = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
      : null
    const screenContext = body.screenContext ?? {}
    const contextInstruction = `Signed-in profile: ${profile?.name ?? 'Unknown user'} (${profile?.role ?? 'unknown role'}). The following is structured context from the currently rendered screen, not the whole application: ${JSON.stringify({ path: screenContext.path ?? 'unknown', title: screenContext.title ?? 'unknown', focusedElement: screenContext.focusedElement ?? '', headings: screenContext.headings ?? [], orderedRows: screenContext.rows ?? [], visibleControls: screenContext.controls ?? [], mainText: (screenContext.mainText ?? '').slice(0, 12000) })}. Treat orderedRows and mainText as the source of truth for questions about what is currently visible. If the requested detail is not present there, say that it is not visible instead of guessing.`
    const logAiInteraction = async (responseSummary: string) => {
      if (!profile || !userId) return
      const now = new Date()
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            userName: profile.name,
            userRole: profile.role,
            action: 'AI_ASSISTANT_USED',
            targetType: 'AI Assistant',
            targetId: screenContext.path ?? null,
            targetName: 'Thabat Bot',
            details: JSON.stringify({
              request: latestUserMessage,
              response: responseSummary.slice(0, 4000),
              route: screenContext.path ?? null,
              pageTitle: screenContext.title ?? null,
              conversationLength: messages.length,
            }),
            ipAddress: request.headers.get('x-forwarded-for') ?? 'local',
            userAgent: request.headers.get('user-agent') ?? 'unknown',
            dateOnly: now.toISOString().slice(0, 10),
            timeOnly: now.toTimeString().slice(0, 8),
            relativeTime: formatRelativeTimeArabic(now),
          },
        })
      } catch (error) {
        console.error('AI assistant audit log failed:', error)
      }
    }

    if (isDeveloperIdentityRequest(latestUserMessage)) {
      const arabicResponse = 'أنا بوت ثَبَت، تم تطويري وبرمجتي بواسطة المطور حسين صبيرة (Hussain Subairah) خصيصًا لنظام ثَبَت لإدارة المدرسة. أنا مدعوم بالذكاء الاصطناعي من Gemini AI في الخلفية، لكنني تم إنشاؤه وتطويري من قبل حسين صبيرة لهذا النظام.'
      const englishResponse = 'I am Thabat Bot, created and developed by Hussain Subairah (حسين صبيرة) specifically for the Thabat School Management System. I am powered by Gemini AI under the hood, but I was built and programmed by Hussain Subairah specifically for this system.'
      const responseText = languageInstruction === 'Respond in both Arabic and English.'
        ? `${arabicResponse}\n\n${englishResponse}`
        : languageInstruction === 'Respond only in English.' ? englishResponse : arabicResponse
      await logAiInteraction(responseText)

      return new Response(createStreamText(responseText), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      })
    }

    const directNavigationPlan = getNavigationProposal(messages)
    if (directNavigationPlan) {
      const responseText = `__THABAT_ACTION_PLAN__${JSON.stringify(directNavigationPlan)}`
      await logAiInteraction(responseText)
      return new Response(createStreamText(responseText), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' } })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    if (ACTION_KEYWORDS.some((keyword) => latestUserMessage.toLowerCase().includes(keyword))) {
      const actionResponse = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        contents: messages.map((message) => ({ role: message.role, parts: [{ text: message.content }] })),
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${contextInstruction}\n\nInterpret action requests as proposals only. Never execute anything. If the request contains enough information, call exactly one proposal function. If required information is missing, answer with a question instead. The field for grade updates must be one of taskPeriod1, taskPeriod2, examPeriod1, examPeriod2, or finalExam.`,
          temperature: 0.1,
          tools: [{ functionDeclarations: [
            { name: 'propose_student_transfer', description: 'Prepare a student division transfer proposal. Understand Arabic phrases such as انقل الطالب, حوّل الطالب, or انقل إلى الشعبة.', parameters: { type: Type.OBJECT, properties: { studentName: { type: Type.STRING }, targetDivision: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ['studentName', 'targetDivision'] } },
            { name: 'propose_grade_update', description: 'Prepare one gradebook score update proposal. Understand Arabic phrases such as سجل درجة, أضف درجة, عدّل درجة, الاختبار النهائي, and أعمال السنة.', parameters: { type: Type.OBJECT, properties: { studentName: { type: Type.STRING }, divisionCode: { type: Type.STRING }, subject: { type: Type.STRING }, field: { type: Type.STRING, enum: ['taskPeriod1', 'taskPeriod2', 'examPeriod1', 'examPeriod2', 'finalExam'] }, value: { type: Type.NUMBER } }, required: ['studentName', 'divisionCode', 'subject', 'field', 'value'] } },
            { name: 'propose_navigation', description: 'Prepare navigation to a known Thabat dashboard tab. Understand Arabic phrases such as افتح, اذهب إلى, خذني إلى, or أرني صفحة.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING, enum: ['/dashboard', '/dashboard/students', '/dashboard/attendance', '/dashboard/class-attendance', '/dashboard/teacher-referrals', '/dashboard/divisions', '/dashboard/gradebook', '/dashboard/reports', '/dashboard/audit-log', '/dashboard/settings'] }, tabName: { type: Type.STRING } }, required: ['path', 'tabName'] } },
          ] }],
        },
      })
      const functionCall = actionResponse.functionCalls?.[0]
      if (functionCall?.name && functionCall.args) {
        const plan = functionCall.name === 'propose_student_transfer'
          ? { type: 'transfer_student', ...functionCall.args }
          : functionCall.name === 'propose_grade_update'
            ? { type: 'update_grade', ...functionCall.args }
            : { type: 'navigate', ...functionCall.args }
        const responseText = `__THABAT_ACTION_PLAN__${JSON.stringify(plan)}`
        await logAiInteraction(responseText)
        return new Response(createStreamText(responseText), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' } })
      }
    }
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: messages.map((message) => ({ role: message.role, parts: [{ text: message.content }] })),
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${contextInstruction}\n\nLatest-message language instruction: ${languageInstruction}`,
        temperature: 0.5,
      },
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let responseText = ''

        try {
          for await (const chunk of responseStream) {
            const text = typeof chunk?.text === 'string' ? chunk.text : ''
            if (text) {
              responseText += text
              controller.enqueue(encoder.encode(text))
            }
          }
          await logAiInteraction(responseText)
          controller.close()
        } catch (error) {
          console.error('Thabat Bot stream failed:', error)
          await logAiInteraction(responseText || 'stream_failed')
          controller.enqueue(encoder.encode('عذرًا،واجهت مشكلة أثناء إنشاء ردّ البوت.'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('Thabat Bot request failed:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
      return NextResponse.json({ error: 'Gemini is configured with an invalid API key. Update GEMINI_API_KEY in the server environment and restart the app.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'تعذر الاتصال ببوت ثَبَت حاليًا.' }, { status: 500 })
  }
}
