import { z } from "zod";

export const partySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    openingBalance: z.number().optional(),
  }),
});

export const productSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    unit: z.enum(["kg", "ltr", "g", "ml", "pcs", "box", "bag", "carton"]),
    packSize: z.number().positive().optional(),
    openingStock: z.number().min(0).optional(),
    price: z.number().min(0),
    scheme: z
      .object({
        isActive: z.boolean().optional(),
        buyQty: z.number().min(0).optional(),
        freeQty: z.number().min(0).optional(),
      })
      .optional(),
  }),
});

export const paymentSchema = z.object({
  body: z.object({
    partyId: z.string().min(1),
    amount: z.number().positive(),
    paymentMode: z.enum(["cash", "online"]).optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    hasDeliveryCharge: z.boolean().optional(),
    deliveryCharge: z.number().min(0).optional(),
  }),
});

export const biltySchema = z.object({
  body: z.object({
    partyId: z.string().min(1),
    date: z.string().optional(),
    billNumber: z.string().max(40).optional(),
    fromCompany: z.boolean().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().positive(),
        })
      )
      .min(1, "At least one item required"),
    hasDeliveryCharge: z.boolean().optional(),
    deliveryCharge: z.number().min(0).optional(),
  }),
});

// Editing a bill: every field optional (party can't change), so callers can
// send just the fields they touched.
export const biltyUpdateSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    billNumber: z.string().max(40).optional(),
    fromCompany: z.boolean().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().positive(),
        })
      )
      .min(1, "At least one item required")
      .optional(),
    hasDeliveryCharge: z.boolean().optional(),
    deliveryCharge: z.number().min(0).optional(),
  }),
});

export const companyPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    mode: z.enum(["online", "cash"]),
    reference: z.string().optional(),
    date: z.string().optional(),
  }),
});

export const expenseSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    category: z.string().min(1),
    note: z.string().optional(),
    date: z.string().optional(),
  }),
});

// Numeric password: digits only, 4–12 chars
const numericPassword = z
  .string()
  .min(4, "Password must be at least 4 digits")
  .max(12, "Password must be at most 12 digits")
  .regex(/^\d+$/, "Password must contain digits only");

const usernameField = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, '.' and '_'");

export const setupSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    username: usernameField,
    password: numericPassword,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: usernameField,
    password: numericPassword,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: numericPassword,
    newPassword: numericPassword,
  }),
});
