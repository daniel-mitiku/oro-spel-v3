import fs from 'fs';
import path from 'path';

// --- Configuration ---
// Make sure this path points to your large text file with all the Oromo sentences.
const INPUT_FILE = './sentence_corpus.txt';
const OUTPUT_DIR = './data';
const SENTENCE_CHUNK_SIZE = 10000; // How many sentences per file

// --- Helper Function ---
const getBaseWord = (word) => {
    if (!word) return "";
    // Cleans the word of punctuation and converts to lowercase
    const cleaned = word
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
        .toLowerCase();
    // Compresses duplicate letters (e.g., "hoorraa" becomes "hora")
    return cleaned.replace(/(.)\1+/g, "$1");
};

// --- Main Logic ---
console.log('Starting pre-processing of the Oromo sentence corpus...');

// 1. Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
}

// 2. Read and process the source corpus file
console.log(`Reading from ${INPUT_FILE}...`);
if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ ERROR: Input file not found at ${INPUT_FILE}`);
    console.error('Please create this file and populate it with your Oromo sentences, one per line.');
    process.exit(1); // Exit the script if the source file is missing
}

const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
const allSentences = fileContent.split(/\r?\n/).filter(line => line.trim() !== "");
console.log(`Found ${allSentences.length} total sentences.`);

// 3. Chunk and save the raw sentences into multiple JSON files for faster loading
console.log(`Splitting sentences into chunks of ${SENTENCE_CHUNK_SIZE}...`);
const numSentenceChunks = Math.ceil(allSentences.length / SENTENCE_CHUNK_SIZE);
for (let i = 0; i < numSentenceChunks; i++) {
    const start = i * SENTENCE_CHUNK_SIZE;
    const end = start + SENTENCE_CHUNK_SIZE;
    const chunk = allSentences.slice(start, end);
    const filePath = path.join(OUTPUT_DIR, `sentences_${i}.json`);
    fs.writeFileSync(filePath, JSON.stringify(chunk, null, 2));
}
console.log(`✅ Saved ${numSentenceChunks} sentence chunks.`);

// 4. Create the powerful baseWord index for quick lookups
console.log('Building the word index...');
const sentenceIndex = {};
allSentences.forEach((sentence, sentenceId) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    const uniqueBaseWordsInSentence = new Set();

    words.forEach(word => {
        const baseWord = getBaseWord(word);
        if (baseWord) uniqueBaseWordsInSentence.add(baseWord);
    });

    uniqueBaseWordsInSentence.forEach(baseWord => {
        if (!Array.isArray(sentenceIndex[baseWord])) {
            sentenceIndex[baseWord] = [];
        }
        sentenceIndex[baseWord].push(sentenceId);
    });
});
console.log(`Index created with ${Object.keys(sentenceIndex).length} unique base words.`);

// 5. Chunk and save the index alphabetically for efficient loading
console.log('Splitting index into alphabetical chunks...');
const indexChunks = {};
for (const baseWord in sentenceIndex) {
    let firstChar = baseWord[0] || 'other';
    if (!/^[a-z]/.test(firstChar)) {
        firstChar = 'other';
    }

    if (!indexChunks[firstChar]) {
        indexChunks[firstChar] = {};
    }
    indexChunks[firstChar][baseWord] = sentenceIndex[baseWord];
}

for (const charKey in indexChunks) {
    const filePath = path.join(OUTPUT_DIR, `index_${charKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(indexChunks[charKey]));
}
console.log(`✅ Saved ${Object.keys(indexChunks).length} index chunks.`);

// 6. Save a metadata file for the client app to understand the chunking
const metadata = {
    totalSentences: allSentences.length,
    sentenceChunkSize: SENTENCE_CHUNK_SIZE,
    numSentenceChunks: numSentenceChunks
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log('✅ Saved metadata file.');

console.log('\n🎉 Pre-processing complete! Your global corpus is ready.');
