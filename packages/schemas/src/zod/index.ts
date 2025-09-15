export { sourceCitation } from "./sourceCitation";
export type { SourceCitation } from "./sourceCitation";
export { evidenceDecisionCard } from "./evidenceDecisionCard";
export type { EvidenceDecisionCard } from "./evidenceDecisionCard";
export { alignmentPacket } from "./alignmentPacket";
export type { AlignmentPacket } from "./alignmentPacket";
export { prismaRecord } from "./prismaRecord";
export type { PrismaRecord } from "./prismaRecord";
export { searchPlan } from "./searchPlan";
export type { SearchPlan } from "./searchPlan";
export { modelRouting } from "./modelRouting";
export type { ModelRouting } from "./modelRouting";

import { sourceCitation as sourceCitationSchema } from "./sourceCitation";
import { evidenceDecisionCard as evidenceDecisionCardSchema } from "./evidenceDecisionCard";
import { alignmentPacket as alignmentPacketSchema } from "./alignmentPacket";
import { prismaRecord as prismaRecordSchema } from "./prismaRecord";
import { searchPlan as searchPlanSchema } from "./searchPlan";
import { modelRouting as modelRoutingSchema } from "./modelRouting";

export const schemas = {
  sourceCitation: sourceCitationSchema,
  evidenceDecisionCard: evidenceDecisionCardSchema,
  alignmentPacket: alignmentPacketSchema,
  prismaRecord: prismaRecordSchema,
  searchPlan: searchPlanSchema,
  modelRouting: modelRoutingSchema,
};
export type Schemas = typeof schemas;
