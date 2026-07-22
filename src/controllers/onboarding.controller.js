import mongoose from "mongoose";
import { partyRepository } from "../repositories/party.repository.js";
import { ledgerService } from "../services/ledger.service.js";
import { inventoryService } from "../services/inventory.service.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const onboardingController = {
  // Step 1: party opening balances → creates party + first ledger entry
  openingBalances: asyncWrapper(async (req, res) => {
    const { parties } = req.body; // [{ name, city, address, openingBalance }]
    const created = [];
    for (const p of parties) {
      const party = await partyRepository.create({
        name: p.name,
        city: p.city,
        address: p.address,
        openingBalance: p.openingBalance || 0,
      });
      if (p.openingBalance && p.openingBalance !== 0) {
        await ledgerService.applyLedgerEntry({
          partyId: party._id,
          type: p.openingBalance > 0 ? "debit" : "credit",
          amount: Math.abs(p.openingBalance),
          description: "Opening balance",
          source: "opening",
        });
      }
      created.push(party);
    }
    res.status(201).json(new ApiResponse(201, created, "Opening balances set"));
  }),

  // Step 2: current home stock per product
  openingStock: asyncWrapper(async (req, res) => {
    const { stock } = req.body; // [{ productId, quantity }]
    const results = [];
    for (const s of stock) {
      const r = await inventoryService.receiveStock({
        productId: s.productId,
        quantity: s.quantity,
        note: "Opening stock (onboarding)",
      });
      results.push(r);
    }
    res.status(201).json(new ApiResponse(201, results, "Opening stock set"));
  }),
};