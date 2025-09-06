import { MongoClient } from "mongodb"
import fs from "fs"
import path from "path"

const DATABASE_URL = process.env.DATABASE_URL || "mongodb+srv://diago:CnbAhamGnqXeb8qF@cluster0.zdxmf2n.mongodb.net/alloc?retryWrites=true&w=majority&appName=Cluster0"
const DATA_DIR = "./public/data"

const getBaseWord = (word) => {
  if (!word) return ""
  const cleaned = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").toLowerCase()
  return cleaned.replace(/(.)\1+/g, "$1")
}

async function seedGlobalCorpus() {
  const client = new MongoClient(DATABASE_URL)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("oromo_app")
    const corpusIndex = db.collection("corpus_index")
    const globalSentences = db.collection("global_sentences")

    // Clear existing global corpus
    await corpusIndex.deleteMany({ userId: null })
    await globalSentences.deleteMany({})
    console.log("Cleared existing global corpus")

    // Read metadata
    const metadataPath = path.join(DATA_DIR, "metadata.json")
    if (!fs.existsSync(metadataPath)) {
      throw new Error("Metadata file not found. Run pre-processing first.")
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"))
    console.log(`Processing ${metadata.numSentenceChunks} sentence chunks...`)

    // Load all sentences
    const allSentences = []
    for (let i = 0; i < metadata.numSentenceChunks; i++) {
      const chunkPath = path.join(DATA_DIR, `sentences_${i}.json`)
      if (fs.existsSync(chunkPath)) {
        const sentences = JSON.parse(fs.readFileSync(chunkPath, "utf8"))
        allSentences.push(...sentences)
      }
    }

    console.log(`Loaded ${allSentences.length} sentences`)

    // Store sentences in global collection
    const sentenceDocs = allSentences.map((sentence, index) => ({
      text: sentence,
      index,
      createdAt: new Date(),
    }))

    // Insert in batches
    const batchSize = 1000
    for (let i = 0; i < sentenceDocs.length; i += batchSize) {
      const batch = sentenceDocs.slice(i, i + batchSize)
      await globalSentences.insertMany(batch)
      console.log(`Inserted sentences batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sentenceDocs.length / batchSize)}`)
    }

    // Build word index
    console.log("Building word index...")
    const wordIndex = {}

    allSentences.forEach((sentence, sentenceId) => {
      const words = sentence.split(/\s+/).filter(Boolean)
      const uniqueBaseWordsInSentence = new Set()

      words.forEach((word) => {
        const baseWord = getBaseWord(word)
        if (baseWord) {
          uniqueBaseWordsInSentence.add(baseWord)

          if (!wordIndex[baseWord]) {
            wordIndex[baseWord] = {
              sentenceIds: [],
              variants: new Set(),
            }
          }

          wordIndex[baseWord].variants.add(word)
        }
      })

      uniqueBaseWordsInSentence.forEach((baseWord) => {
        wordIndex[baseWord].sentenceIds.push(sentenceId)
      })
    })

    // Insert word index
    const indexDocs = Object.entries(wordIndex).map(([baseWord, data]) => ({
      baseWord,
      userId: null, // Global corpus
      sentenceIds: data.sentenceIds,
      variants: Array.from(data.variants),
      createdAt: new Date(),
    }))

    // Insert index in batches
    for (let i = 0; i < indexDocs.length; i += batchSize) {
      const batch = indexDocs.slice(i, i + batchSize)
      await corpusIndex.insertMany(batch)
      console.log(`Inserted index batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexDocs.length / batchSize)}`)
    }

    console.log(`✅ Global corpus seeded successfully!`)
    console.log(`- ${allSentences.length} sentences`)
    console.log(`- ${Object.keys(wordIndex).length} unique base words`)

  } catch (error) {
    console.error("Error seeding global corpus:", error)
  } finally {
    await client.close()
  }
}

seedGlobalCorpus()
