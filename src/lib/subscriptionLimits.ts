export const PLANS = {
  FREE_TRIAL: { id: 'trial', memberLimit: 3 },
  ESSENTIAL: { id: 'essential', baseMemberLimit: 10 },
  PROFESSIONAL: { id: 'professional', baseMemberLimit: 50 },
  ENTERPRISE: { id: 'enterprise', baseMemberLimit: 1000 },
};

export const getMemberLimit = (companyData: any) => {
  const baseLimit = companyData.baseMemberLimit || 0;
  const addOnLimit = companyData.addOnMembers || 0;
  return baseLimit + addOnLimit;
};
