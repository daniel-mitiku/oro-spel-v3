import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Initializing database...')

  try {
    // Test the connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Create some sample global corpus data
    const sampleSentences = [
      "Akkam jirta?",
      "Maqaan koo Caaltuu dha.",
      "Ani barnoota barbaada.",
      "Guyyaan har'aa gaarii dha.",
      "Nyaata mi'aawaa nyaadhe."
    ]

    for (const sentence of sampleSentences) {
      const words = sentence.split(' ')
      const baseWords = words.map(word => {
        const cleaned = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").toLowerCase()
        return cleaned.replace(/(.)\1+/g, "$1")
      })

      await prisma.globalCorpus.upsert({
        where: { sentence },
        update: {},
        create: {
          sentence,
          words: JSON.stringify(words),
          baseWords: JSON.stringify(baseWords),
        },
      })
    }

    console.log('✅ Sample corpus data created')
    console.log('🎉 Database initialization complete!')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
