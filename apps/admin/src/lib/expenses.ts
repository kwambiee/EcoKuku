import { db } from '@ecokuku/db';

type ExpenseCategory = 'FEED' | 'MEDICINE_VACCINE' | 'CHICKS_PURCHASE' | 'EQUIPMENT' | 'LABOUR' | 'UTILITIES' | 'TRANSPORT' | 'VETERINARY' | 'OTHER';

interface AutoExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number | string;
  vendor?: string;
  date?: Date;
  sourceType: string;
  sourceId: string;
}

export async function createAutoExpense(input: AutoExpenseInput) {
  return db.expense.create({
    data: {
      category: input.category,
      description: input.description,
      amount: input.amount,
      vendor: input.vendor || null,
      date: input.date || new Date(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
  });
}
