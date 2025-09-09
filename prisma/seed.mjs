// prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const INPUT_FILE = './sentence_corpus.txt';

const getBaseWord = (word) => {
    if (!word) return "";
    return word
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
        .toLowerCase()
        .replace(/(.)\1+/g, "$1");
};

async function main() {
    console.log('Starting database seeding...');

    // 1. Clear existing global corpus data
    console.log('Clearing old global corpus data...');
    await prisma.corpusIndex.deleteMany({ where: { userId: null } });
    await prisma.globalSentence.deleteMany({});
    console.log('Old data cleared.');

    // 2. Read and process the corpus file
    const fileContent = fs.readFileSync(path.resolve(INPUT_FILE), 'utf8');
    const allSentences = fileContent.split(/\r?\n/).filter(line => line.trim() !== "");
    const uniqueSentences = [...new Set(allSentences)];
    console.log(`Found ${uniqueSentences.length} unique sentences.`);

    // 3. Seed the GlobalSentence table
    console.log('Seeding GlobalSentence table...');
    const sentenceData = uniqueSentences.map((text, index) => ({
        id: index + 1, // Use a simple 1-based integer ID
        text: text,
    }));

    await prisma.globalSentence.createMany({ data: sentenceData });
    console.log(`${sentenceData.length} sentences seeded.`);

    // 4. Create the index in memory
    console.log('Creating index in memory...');
    const corpusIndex = new Map();
    uniqueSentences.forEach((sentence, index) => {
        const sentenceId = (index + 1).toString(); // Use the same ID as above, as a string
        const words = sentence.split(/\s+/).filter(Boolean);
        words.forEach(word => {
            const baseWord = getBaseWord(word);
            if (!baseWord) return;
            if (!corpusIndex.has(baseWord)) {
                corpusIndex.set(baseWord, { variants: new Set(), sentenceIds: new Set() });
            }
            const entry = corpusIndex.get(baseWord);
            entry.variants.add(word);
            entry.sentenceIds.add(sentenceId);
        });
    });
    console.log(`Index created with ${corpusIndex.size} unique base words.`);

    // 5. Seed the CorpusIndex table for the global corpus
    console.log('Seeding CorpusIndex table...');
    const indexData = Array.from(corpusIndex.entries()).map(([baseWord, data]) => ({
        baseWord,
        variants: Array.from(data.variants),
        sentenceIds: Array.from(data.sentenceIds),
        userId: null, // Mark as a global entry
    }));

    await prisma.corpusIndex.createMany({ data: indexData });
    console.log(`${indexData.length} global index entries seeded.`);

    console.log('Seeding finished successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });