import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SYSTEM_INSTRUCTION = `You are Thabat Bot (بوت ثَبَت), the intelligent AI assistant for the Thabat School Management System, created by Hussain Subairah (حسين صبيرة).

Important identity rule:
- If the user asks who created or developed you, or asks about the developer, say that you were created and programmed by Hussain Subairah (حسين صبيرة) specifically for the Thabat School Management System.
- Say: "I am Thabat Bot, created and developed by Hussain Subairah (حسين صبيرة) specifically for the Thabat School Management System. I am powered by Gemini AI under the hood, but I was built and programmed by Hussain Subairah for this system."
- In Arabic, respond: "أنا بوت ثَبَت، تم تطويري وبرمجتي بواسطة المطور حسين صبيرة (Hussain Subairah) خصيصًا لنظام ثَبَت لإدارة المدرسة. أنا مدعوم بالذكاء الاصطناعي من Gemini AI في الخلفية، لكنني تم إنشاؤه وتطويره من قبل حسين صبيرة لهذا النظام."
- Never say that you were created by Google or that you are an AI built by Google.

Personality and tone:
- Tone: Warm, helpful, confident, and professional.
- Language: Professional Arabic with a warm, natural tone. Use greetings like "أهلاً بك!" or "أبشر!" where appropriate.
- Language matching: Reply in the same language as the user's latest message. If the latest user message is in English, reply in English; if it is in Arabic, reply in Arabic. Do not switch languages just because an earlier message used another language.
- Explicit language requests override language matching. If the user asks for Arabic and English, provide both languages. If the user asks for English only, reply only in English. If the user asks for Arabic only, reply only in Arabic. Apply equivalent requests expressed in Arabic as well.
- Character: Friendly, supportive, efficient, and encouraging.
- Emojis: Use 1-3 context-appropriate emojis per response, such as 👋, ✅, ⚠️, 📊, or 💡, to add warmth and emphasis without clutter.
- Conciseness: Auto-adjust your response length based on the query. Keep simple answers short (1-3 sentences with an encouraging emoji). For detailed instructions, use clear bullet points with icon indicators.

Help users with:
- Managing student profiles and editing missing identity, division, grade, and conduct-note fields.
- Importing Excel and CSV rosters, detecting messy headers, mapping columns, and handling blank values.
- Issuing behavior warnings, applying deductions, and understanding score restoration when a warning is deleted.
- Registering daily attendance as Present, Absent, or Late, and understanding the attendance percentage.
- Viewing audit logs and transferring students between divisions.

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

const isArabicText = (value: string): boolean => /[\u0600-\u06FF]/u.test(value)

const getLanguageInstruction = (value: string): string => {
  const normalized = value.toLowerCase()
  const asksForBoth = (normalized.includes('arabic') && normalized.includes('english')) || (normalized.includes('العربية') && normalized.includes('الإنجليزية')) || normalized.includes('عربي وانجليزي') || normalized.includes('عربي وإنجليزي')
  const asksForEnglishOnly = normalized.includes('english only') || normalized.includes('بالإنجليزية فقط') || normalized.includes('انجليزي فقط') || normalized.includes('إنجليزي فقط')
  const asksForArabicOnly = normalized.includes('arabic only') || normalized.includes('بالعربية فقط') || normalized.includes('عربي فقط') || normalized.includes('عربية فقط')

  if (asksForBoth) return 'Respond in both Arabic and English.'
  if (asksForEnglishOnly) return 'Respond only in English.'
  if (asksForArabicOnly) return 'Respond only in Arabic.'
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
    'who is your creator',
    'who is your maker',
    'who developed you',
    'developer',
    'creator',
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
    const body = await request.json() as { messages?: ChatMessage[] }
    const messages = Array.isArray(body.messages)
      ? body.messages.filter((message) => (message.role === 'user' || message.role === 'model') && typeof message.content === 'string' && message.content.trim())
      : []

    if (!messages.length) return NextResponse.json({ error: 'A chat message is required.' }, { status: 400 })
    if (messages.length > MAX_CHAT_MESSAGES || messages.some((message) => message.content.length > MAX_MESSAGE_LENGTH) || messages.reduce((total, message) => total + message.content.length, 0) > MAX_CHAT_LENGTH) {
      return NextResponse.json({ error: 'Chat input is too long. Please start a new conversation or shorten the message.' }, { status: 413 })
    }
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 })

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
    const languageInstruction = getLanguageInstruction(latestUserMessage)

    if (isDeveloperIdentityRequest(latestUserMessage)) {
      const arabicResponse = 'أنا بوت ثَبَت، تم تطويري وبرمجتي بواسطة المطور حسين صبيرة (Hussain Subairah) خصيصًا لنظام ثَبَت لإدارة المدرسة. أنا مدعوم بالذكاء الاصطناعي من Gemini AI في الخلفية، لكنني تم إنشاؤه وتطويري من قبل حسين صبيرة لهذا النظام.'
      const englishResponse = 'I am Thabat Bot, created and developed by Hussain Subairah (حسين صبيرة) specifically for the Thabat School Management System. I am powered by Gemini AI under the hood, but I was built and programmed by Hussain Subairah specifically for this system.'
      const responseText = languageInstruction === 'Respond in both Arabic and English.'
        ? `${arabicResponse}\n\n${englishResponse}`
        : languageInstruction === 'Respond only in English.' ? englishResponse : arabicResponse

      return new Response(createStreamText(responseText), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: messages.map((message) => ({ role: message.role, parts: [{ text: message.content }] })),
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nLatest-message language instruction: ${languageInstruction}`,
        temperature: 0.5,
      },
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const chunk of responseStream) {
            const text = typeof chunk?.text === 'string' ? chunk.text : ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (error) {
          console.error('Thabat Bot stream failed:', error)
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
    return NextResponse.json({ error: 'تعذر الاتصال ببوت ثَبَت حاليًا.' }, { status: 500 })
  }
}
