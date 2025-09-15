import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { Cite } from 'citation-js';
import { prisma } from '../lib/prisma';
import { normalizeDOI } from '../lib/doiUtils';

export interface DocxExportOptions {
  includeAbstract?: boolean;
  includeAuthors?: boolean;
  includeJournal?: boolean;
  citationStyle?: 'vancouver' | 'apa' | 'chicago' | 'harvard';
  includePrismaFlow?: boolean;
  includeIntegrityFlags?: boolean;
}

export interface DocxExportResult {
  buffer: Buffer;
  filename: string;
  metadata: {
    candidateCount: number;
    includedCount: number;
    excludedCount: number;
    exportDate: Date;
  };
}

/**
 * Export project candidates to DOCX with in-text citations
 */
export async function exportToDocx(
  projectId: string,
  options: DocxExportOptions = {}
): Promise<DocxExportResult> {
  const {
    includeAbstract = true,
    includeAuthors = true,
    includeJournal = true,
    citationStyle = 'vancouver',
    includePrismaFlow = true,
    includeIntegrityFlags = true
  } = options;

  // Get project and candidates
  const [project, candidates, prismaData] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, description: true }
    }),
    prisma.candidate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.prismaData.findUnique({
      where: { projectId }
    })
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  if (candidates.length === 0) {
    throw new Error('No candidates found for export');
  }

  // Initialize citation-js with Vancouver style
  const cite = new Cite();
  cite.set({
    format: 'string',
    type: 'string',
    style: citationStyle,
    lang: 'en-US'
  });

  // Build document sections
  const sections: any[] = [];

  // Title page
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: project.title,
          bold: true,
          size: 32
        })
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  if (project.description) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.description,
            size: 24
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  }

  // PRISMA flow diagram (if requested)
  if (includePrismaFlow && prismaData) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PRISMA Flow Diagram',
            bold: true,
            size: 28
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    const prismaText = [
      `Records identified: ${prismaData.identified}`,
      `Records after duplicates removed: ${prismaData.deduped}`,
      `Records screened: ${prismaData.screened}`,
      `Records included: ${prismaData.included}`,
      `Records excluded: ${prismaData.excluded}`
    ].join('\n');

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: prismaText,
            size: 24
          })
        ],
        spacing: { after: 400 }
      })
    );
  }

  // Included studies section
  const includedCandidates = candidates.filter(c => c.status === 'included');
  const excludedCandidates = candidates.filter(c => c.status === 'excluded');

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Included Studies',
          bold: true,
          size: 28
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  );

  // Add included candidates
  for (let i = 0; i < includedCandidates.length; i++) {
    const candidate = includedCandidates[i];
    const citationNumber = i + 1;

    // Create citation entry
    const citationData = createCitationData(candidate);
    const citation = cite.add(citationData).get({ format: 'string' });

    // Candidate title with citation
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${citationNumber}. `,
            bold: true
          }),
          new TextRun({
            text: candidate.title,
            bold: true
          })
        ],
        spacing: { after: 100 }
      })
    );

    // Authors (if requested)
    if (includeAuthors && candidate.authors && candidate.authors.length > 0) {
      const authorsText = Array.isArray(candidate.authors) 
        ? candidate.authors.join(', ')
        : candidate.authors;
      
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Authors: ${authorsText}`,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    // Journal (if requested)
    if (includeJournal && candidate.journal) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Journal: ${candidate.journal}`,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    // Abstract (if requested)
    if (includeAbstract && candidate.abstract) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Abstract: ',
              bold: true
            }),
            new TextRun({
              text: candidate.abstract,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    // Integrity flags (if requested)
    if (includeIntegrityFlags && candidate.flags) {
      const flags = candidate.flags as any;
      const flagTexts: string[] = [];
      
      if (flags.retracted) flagTexts.push('Retracted');
      if (flags.predatory) flagTexts.push('Predatory Journal');
      
      if (flagTexts.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Flags: ${flagTexts.join(', ')}`,
                color: 'FF0000',
                bold: true
              })
            ],
            spacing: { after: 100 }
          })
        );
      }
    }

    // Citation
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: citation,
            size: 20,
            italics: true
          })
        ],
        spacing: { after: 200 }
      })
    );
  }

  // Excluded studies section (if any)
  if (excludedCandidates.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Excluded Studies',
            bold: true,
            size: 28
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    for (const candidate of excludedCandidates) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${candidate.title}`,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }
  }

  // References section
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'References',
          bold: true,
          size: 28
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  );

  // Add all citations to references
  const allCitations = cite.get({ format: 'string' });
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: allCitations,
          size: 20
        })
      ],
      spacing: { after: 100 }
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_export_${timestamp}.docx`;

  return {
    buffer,
    filename,
    metadata: {
      candidateCount: candidates.length,
      includedCount: includedCandidates.length,
      excludedCount: excludedCandidates.length,
      exportDate: new Date()
    }
  };
}

/**
 * Create citation data from candidate
 */
function createCitationData(candidate: any): any {
  const data: any = {
    type: 'article-journal',
    title: candidate.title,
    'container-title': candidate.journal || '',
    issued: candidate.year ? { 'date-parts': [[candidate.year]] } : undefined,
    DOI: candidate.doi ? normalizeDOI(candidate.doi) : undefined,
    PMID: candidate.pmid,
    PMCID: candidate.pmcid
  };

  // Handle authors
  if (candidate.authors && candidate.authors.length > 0) {
    data.author = candidate.authors.map((author: any) => {
      if (typeof author === 'string') {
        // Simple string author
        const parts = author.split(' ');
        return {
          family: parts[parts.length - 1],
          given: parts.slice(0, -1).join(' ')
        };
      } else if (author.family && author.given) {
        // Already structured
        return author;
      } else {
        // Fallback
        return { family: author.toString() };
      }
    });
  }

  return data;
}
