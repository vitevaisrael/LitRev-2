import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'admin@thescientist.app' },
    update: {},
    create: {
      email: 'admin@thescientist.app',
      passwordHash: 'hashed-password-placeholder' // In real app, hash with argon2
    }
  });

  // Create "IgAN & Uveitis" project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'IgAN & Uveitis',
      ownerId: user.id,
      settings: { preferOA: true }
    }
  });

  // Create PRISMA counters
  await prisma.prismaData.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      identified: 3,
      duplicates: 0,
      screened: 0,
      included: 0,
      excluded: 0
    }
  });

  // Create 3 realistic candidates
  const candidates = [
    {
      id: '00000000-0000-0000-0000-000000000011',
      title: 'Corticosteroids in IgA Nephropathy: A Systematic Review and Meta-Analysis',
      journal: 'JAMA',
      year: 2023,
      doi: '10.1001/jama.2023.12345',
      pmid: '12345678',
      authors: ['Smith J', 'Johnson A', 'Brown K'],
      abstract: 'Background: IgA nephropathy is the most common primary glomerulonephritis worldwide. The role of corticosteroids in treating IgA nephropathy remains controversial. Methods: We conducted a systematic review and meta-analysis...',
      links: {
        oaUrl: 'https://jamanetwork.com/journals/jama/fullarticle/12345',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345678/'
      },
      score: {
        design: 35, // RCT
        directness: 10, // Exact PICO match
        recency: 5, // Recent
        journal: 5, // High impact
        total: 55
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      title: 'Adalimumab for the Treatment of Uveitis in Patients with Spondyloarthritis',
      journal: 'New England Journal of Medicine',
      year: 2022,
      doi: '10.1056/NEJM.2022.67890',
      pmid: '87654321',
      authors: ['Garcia M', 'Lee S', 'Wilson P'],
      abstract: 'Background: Uveitis is a common extra-articular manifestation of spondyloarthritis. Adalimumab, a tumor necrosis factor inhibitor, has shown promise in treating uveitis. Methods: We conducted a randomized, double-blind...',
      links: {
        oaUrl: 'https://www.nejm.org/doi/full/10.1056/NEJM.2022.67890',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/87654321/'
      },
      score: {
        design: 35, // RCT
        directness: 8, // Good match
        recency: 5, // Recent
        journal: 5, // High impact
        total: 53
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000013',
      title: 'IgA Nephropathy: Pathogenesis, Diagnosis, and Treatment',
      journal: 'Nature Reviews Nephrology',
      year: 2021,
      doi: '10.1038/s41581-021-00456-7',
      pmid: '11223344',
      authors: ['Chen L', 'Rodriguez A', 'Thompson K'],
      abstract: 'IgA nephropathy is characterized by mesangial deposition of IgA-containing immune complexes. This review summarizes current understanding of the pathogenesis, diagnostic approaches, and treatment strategies...',
      links: {
        oaUrl: 'https://www.nature.com/articles/s41581-021-00456-7',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/11223344/'
      },
      score: {
        design: 20, // Review article
        directness: 10, // Exact match
        recency: 3, // Moderately recent
        journal: 5, // High impact
        total: 38
      }
    }
  ];

  for (const candidate of candidates) {
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {},
      create: {
        ...candidate,
        projectId: project.id
      }
    });
  }

  // Create one ParsedDoc stub with 2-3 pages and sentences
  const parsedDoc = {
    id: '00000000-0000-0000-0000-000000000021',
    projectId: project.id,
    candidateId: candidates[0].id, // Link to first candidate
    storageKey: 'projects/00000000-0000-0000-0000-000000000001/candidates/00000000-0000-0000-0000-000000000011.pdf',
    textJson: {
      pages: [
        {
          page: 1,
          sentences: [
            { idx: 1, text: 'IgA nephropathy is the most common primary glomerulonephritis worldwide.' },
            { idx: 2, text: 'The role of corticosteroids in treating IgA nephropathy remains controversial.' },
            { idx: 3, text: 'Previous studies have shown conflicting results regarding the efficacy of steroid therapy.' }
          ]
        },
        {
          page: 2,
          sentences: [
            { idx: 1, text: 'We conducted a systematic review and meta-analysis of randomized controlled trials.' },
            { idx: 2, text: 'The primary outcome was proteinuria reduction at 12 months.' },
            { idx: 3, text: 'Secondary outcomes included eGFR preservation and adverse events.' }
          ]
        },
        {
          page: 3,
          sentences: [
            { idx: 1, text: 'A total of 15 studies with 1,247 patients were included in the analysis.' },
            { idx: 2, text: 'Corticosteroid therapy was associated with a significant reduction in proteinuria.' },
            { idx: 3, text: 'The risk of adverse events was higher in the steroid group compared to controls.' }
          ]
        }
      ]
    }
  };

  await prisma.parsedDoc.upsert({
    where: { id: parsedDoc.id },
    update: {},
    create: parsedDoc
  });

  console.log('Seed data created successfully!');
  console.log(`- User: ${user.email}`);
  console.log(`- Project: ${project.title}`);
  console.log(`- Candidates: ${candidates.length}`);
  console.log(`- ParsedDoc: 1 with ${parsedDoc.textJson.pages.length} pages`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
