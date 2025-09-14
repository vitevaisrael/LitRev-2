export interface PrismaCounters {
  identified: number;
  duplicates: number;
  screened: number;
  included: number;
  excluded: number;
}

export function generatePrismaSvg(counters: PrismaCounters): string {
  const { identified, duplicates, screened, included, excluded } = counters;
  
  // Simple PRISMA flow diagram
  const svg = `
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .box { fill: #e1f5fe; stroke: #01579b; stroke-width: 2; }
      .text { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
      .title { font-size: 16px; font-weight: bold; }
    </style>
  </defs>
  
  <!-- Title -->
  <text x="200" y="30" class="text title">PRISMA Flow Diagram</text>
  
  <!-- Records identified -->
  <rect x="150" y="60" width="100" height="40" class="box"/>
  <text x="200" y="85" class="text">Records identified: ${identified}</text>
  
  <!-- Arrow down -->
  <line x1="200" y1="100" x2="200" y2="130" stroke="#01579b" stroke-width="2"/>
  <polygon points="195,125 200,135 205,125" fill="#01579b"/>
  
  <!-- Duplicates removed -->
  <rect x="150" y="140" width="100" height="40" class="box"/>
  <text x="200" y="165" class="text">Duplicates removed: ${duplicates}</text>
  
  <!-- Arrow down -->
  <line x1="200" y1="180" x2="200" y2="210" stroke="#01579b" stroke-width="2"/>
  <polygon points="195,205 200,215 205,205" fill="#01579b"/>
  
  <!-- Records screened -->
  <rect x="150" y="220" width="100" height="40" class="box"/>
  <text x="200" y="245" class="text">Records screened: ${screened}</text>
  
  <!-- Arrow down -->
  <line x1="200" y1="260" x2="200" y2="290" stroke="#01579b" stroke-width="2"/>
  <polygon points="195,285 200,295 205,285" fill="#01579b"/>
  
  <!-- Records included -->
  <rect x="150" y="300" width="100" height="40" class="box"/>
  <text x="200" y="325" class="text">Records included: ${included}</text>
  
  <!-- Excluded count -->
  <text x="350" y="325" class="text">Records excluded: ${excluded}</text>
  
  <!-- Legend -->
  <text x="200" y="380" class="text title">Summary</text>
  <text x="200" y="400" class="text">Total identified: ${identified}</text>
  <text x="200" y="420" class="text">After deduplication: ${identified - duplicates}</text>
  <text x="200" y="440" class="text">After screening: ${included + excluded}</text>
  <text x="200" y="460" class="text">Final included: ${included}</text>
</svg>`;

  return svg;
}
