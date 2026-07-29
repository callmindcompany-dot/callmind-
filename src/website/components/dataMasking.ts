export const maskPhone = (phone: string, isAdmin: boolean) => {
  if (isAdmin || !phone) return phone;
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 5) return phone;
  return clean.substring(0, 5) + '*'.repeat(5);
};

export const maskEmail = (email: string, isAdmin: boolean) => {
  if (isAdmin || !email) return email;
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const masked = user.substring(0, Math.min(4, user.length)) + '*'.repeat(Math.max(0, user.length - 4));
  return `${masked}@${domain}`;
};
