export type EntityStatus = 'active' | 'inactive' | 'pending';

export interface Organization {
  id: string;
  name: string;
  taxId: string;
  address: string;
  contactEmail: string;
}

export interface Community {
  id: string;
  code: string;
  name: string;
  nif: string;
  address: string;
  bankAccountRef: string;
  status: EntityStatus;
}

export interface Unit {
  id: string;
  communityId: string;
  unitCode: string;
  floor: string;
  door: string;
  type: 'vivienda' | 'garaje' | 'trastero' | 'local';
  coefficient: number;
  active: boolean;
}

export interface Owner {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  taxId: string;
  mailingAddress: string;
}

export interface UnitOwner {
  id: string;
  unitId: string;
  ownerId: string;
  ownershipPercentage: number;
}

export interface BankTransaction {
  id: string;
  communityId: string;
  transactionDate: string;
  description: string;
  amount: number;
  direction: 'income' | 'expense';
  category?: string;
  reviewStatus: 'pending' | 'reviewed' | 'doubtful';
}

export interface Debt {
  id: string;
  communityId: string;
  unitId: string;
  ownerId: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: string;
  channel: 'email' | 'whatsapp' | 'telegram' | 'sms' | 'carta';
  subject: string;
  body: string;
}

export interface Communication {
  id: string;
  communityId: string;
  templateId?: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'sent' | 'pending' | 'error';
  sentAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  details: string;
}
