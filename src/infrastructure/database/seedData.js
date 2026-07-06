import { masterBranches, masterDataCollections, masterUsers } from './masterData.js';

export const seedBranches = masterBranches;
export const seedUsers = masterUsers;

export const seedCollections = {
  payins: [],
  auditLogs: [],
  ...masterDataCollections
};
