import { 
  Document, 
  Packer, 
  Paragraph, 
  HeadingLevel, 
  TextRun, 
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType
} from "docx";
import { prisma } from "../../lib/prisma.js";
import type { ExportDocxOptions } from "@the-scientist/schemas";

interface DocxSection {
  title: string;
  content: Paragraph[];
}

export class DocxBuilder {
  private projectId: string;
  private options: ExportDocxOptions;
  private sections: DocxSection[] = [];

  constructor(projectId: string, options: ExportDocxOptions = {} as ExportDocxOptions) {
    this.projectId = projectId;
    this.options = {
      includeSupports: options.includeSupports ?? true,
      includePrisma: options.includePrisma ?? true,
      includeProfile: options.includeProfile ?? true,
      format: options.format ?? "academic"
    };
  }

  async build(): Promise<Buffer> {
    console.log({ projectId: this.projectId, options: this.options }, "Building DOCX export");
    
    // Load all project data
    const project = await this.loadProjectData();
    if (!project) {
      throw new Error("Project not found");
    }

    // Build sections based on format
    await this.buildTitlePage(project);
    
    if (this.options.includeProfile && project.problemProfile) {
      await this.buildProblemProfile(project.problemProfile);
    }
    
    if (this.options.includePrisma && project.prisma) {
      await this.buildPrismaSection(project.prisma);
    }
    
    await this.buildDraftSections(project.drafts);
    
    if (this.options.includeSupports && project.claims.length > 0) {
      await this.buildEvidenceSection(project.claims);
    }
    
    await this.buildReferencesSection(project.candidates);

    // Create document
    const doc = new Document({
      creator: "The Scientist - Medical Literature Review Platform",
      description: `Export of project: ${project.title}`,
      sections: [{
        properties: {},
        children: this.sections.flatMap(s => [
          new Paragraph({
            children: [new TextRun({ text: s.title })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          ...s.content,
          new Paragraph({ children: [new TextRun({ text: "" })] }) // spacer
        ])
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    console.log({ projectId: this.projectId, size: buffer.length }, "DOCX export completed");
    return buffer;
  }

  private async loadProjectData() {
    return await prisma.project.findUnique({
      where: { id: this.projectId },
      include: {
        problemProfile: true,
        prisma: true,
        drafts: {
          orderBy: { section: 'asc' }
        },
        candidates: {
          where: this.options.format === "academic" ? {
            decisions: {
              some: { action: 'include' }
            }
          } : undefined,
          include: {
            decisions: {
              orderBy: { ts: 'desc' },
              take: 1
            }
          },
          orderBy: { year: 'desc' }
        },
        claims: {
          include: {
            supports: {
              include: {
                candidate: {
                  select: { title: true, year: true }
                }
              }
            }
          }
        }
      }
    }) as any;
  }

  private async buildTitlePage(project: any) {
    const content: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: project.title || "Untitled Project" })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}` })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 }
      })
    ];

    if (this.options.format === "academic") {
      content.push(new Paragraph({ children: [new PageBreak()] }));
    }

    this.sections.push({ title: "", content });
  }

  private async buildProblemProfile(profile: any) {
    const content: Paragraph[] = [];
    
    // PICO elements
    const elements = [
      { key: 'population', label: 'Population' },
      { key: 'intervention', label: 'Intervention' },
      { key: 'comparator', label: 'Comparator' },
      { key: 'outcomes', label: 'Outcomes' }
    ];

    for (const elem of elements) {
      if (profile[elem.key]) {
        const value = typeof profile[elem.key] === 'string' 
          ? profile[elem.key] 
          : JSON.stringify(profile[elem.key], null, 2);
        
        content.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${elem.label}: `, bold: true }),
              new TextRun(value)
            ],
            spacing: { after: 120 }
          })
        );
      }
    }

    // Time frame
    if (profile.timeframe) {
      const tf = profile.timeframe as any;
      content.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Time Frame: ", bold: true }),
            new TextRun(`${tf.from || 'Any'} - ${tf.to || 'Present'}`)
          ],
          spacing: { after: 120 }
        })
      );
    }

    this.sections.push({ title: "Problem Profile", content });
  }

  private async buildPrismaSection(prismaData: any) {
    const content: Paragraph[] = [];

    // Create a simple table for PRISMA flow
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Stage", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Count", bold: true })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Studies identified")] }),
            new TableCell({ children: [new Paragraph(String(prismaData.identified || 0))] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Duplicates removed")] }),
            new TableCell({ children: [new Paragraph(String(prismaData.duplicates || 0))] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Studies screened")] }),
            new TableCell({ children: [new Paragraph(String(prismaData.screened || 0))] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Studies included")] }),
            new TableCell({ children: [new Paragraph(String(prismaData.included || 0))] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Studies excluded")] }),
            new TableCell({ children: [new Paragraph(String(prismaData.excluded || 0))] })
          ]
        })
      ]
    });

    content.push(new Paragraph({ children: [table] }));
    this.sections.push({ title: "PRISMA Flow Summary", content });
  }

  private async buildDraftSections(drafts: any[]) {
    for (const draft of drafts) {
      const content: Paragraph[] = [];
      
      // Process content with citation replacement
      let text = draft.content || "(No content)";
      
      // Replace [SUPPORT:xxxx] citations with numbered references
      if (draft.citations && Array.isArray(draft.citations)) {
        draft.citations.forEach((citeId: string, idx: number) => {
          text = text.replace(new RegExp(`\\[SUPPORT:${citeId}\\]`, 'g'), `[${idx + 1}]`);
        });
      }

      // Split into paragraphs
      const paragraphs = text.split(/\n\n+/).filter((p: string) => p.trim());
      for (const para of paragraphs) {
        content.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim() })],
            spacing: { after: 120 }
          })
        );
      }

      this.sections.push({ title: draft.section, content });
    }
  }

  private async buildEvidenceSection(claims: any[]) {
    const content: Paragraph[] = [];

    for (const claim of claims) {
      // Claim as subheading
      content.push(
        new Paragraph({
          children: [new TextRun({ text: claim.text })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 60 }
        })
      );

      // Supporting evidence
      for (const support of claim.supports) {
        const locator = support.locator as any;
        const pageInfo = locator?.page ? `, p.${locator.page}` : '';
        
        content.push(
          new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true }),
              new TextRun({ text: `"${support.quote}" `, italics: true }),
              new TextRun({ 
                text: `(${support.candidate.title}, ${support.candidate.year}${pageInfo})`,
                color: "666666"
              })
            ],
            spacing: { after: 60 },
            indent: { left: 360 }
          })
        );
      }
    }

    this.sections.push({ title: "Evidence Summary", content });
  }

  private async buildReferencesSection(candidates: any[]) {
    const content: Paragraph[] = [];

    candidates.forEach((candidate, idx) => {
      // Format authors
      let authorsText = "";
      if (candidate.authors && Array.isArray(candidate.authors)) {
        const authors = candidate.authors as string[];
        if (authors.length > 0) {
          authorsText = authors.length > 3 
            ? `${authors.slice(0, 3).join(", ")}, et al.`
            : authors.join(", ");
        }
      }

      // Build reference entry
      const parts: TextRun[] = [
        new TextRun({ text: `${idx + 1}. `, bold: true })
      ];

      if (authorsText) {
        parts.push(new TextRun(`${authorsText}. `));
      }

      parts.push(
        new TextRun({ text: candidate.title, italics: true }),
        new TextRun(`. ${candidate.journal}.`)
      );

      if (candidate.year) {
        parts.push(new TextRun(` ${candidate.year};`));
      }

      if (candidate.doi) {
        parts.push(new TextRun(` doi:${candidate.doi}`));
      }

      if (candidate.pmid) {
        parts.push(new TextRun(` PMID:${candidate.pmid}`));
      }

      content.push(
        new Paragraph({
          children: parts,
          spacing: { after: 60 }
        })
      );
    });

    this.sections.push({ title: "References", content });
  }
}

// Export convenience function
export async function buildProjectDocx(
  projectId: string, 
  options?: ExportDocxOptions
): Promise<Buffer> {
  const builder = new DocxBuilder(projectId, options);
  return await builder.build();
}
