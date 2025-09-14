import * as pdfjsLib from 'pdfjs-dist';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { ParsedDoc } from './types';

const nlp = winkNLP(model);

export async function parsePdf(buffer: Buffer): Promise<ParsedDoc> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out();
    
    pages.push({
      page: i,
      sentences: sentences.map((sentence, idx) => ({
        idx: idx + 1,
        text: sentence
      }))
    });
  }
  
  return { pages };
}
