/**
 * Inventory Manager — stock movements, transfers, valuation, low-stock alerts.
 */

/**
 * Get total stock for an item across all warehouses.
 * @param {array} stockRecords - warehouse_stock rows for the item
 */
export function getTotalStock(stockRecords) {
  return stockRecords.reduce((sum, s) => sum + (s.quantity || 0), 0);
}

/**
 * Check if item is at or below reorder level.
 */
export function isLowStock(item, totalStock) {
  return totalStock <= (item.reorder_level || 0);
}

/**
 * Calculate stock valuation for a company.
 * @param {array} items - inventory_items
 * @param {array} stockRecords - all warehouse_stock rows
 */
export function calculateStockValuation(items, stockRecords) {
  let totalCost = 0;
  let totalRetail = 0;
  const perItem = items.map(item => {
    const itemStock = stockRecords.filter(s => s.item_id === item.id);
    const qty = getTotalStock(itemStock);
    const cost = qty * (item.unit_cost || 0);
    const retail = qty * (item.selling_price || 0);
    totalCost += cost;
    totalRetail += retail;
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: qty,
      unit_cost: item.unit_cost,
      selling_price: item.selling_price,
      total_cost: cost,
      total_retail: retail,
      low_stock: isLowStock(item, qty),
    };
  });
  return { perItem, totalCost, totalRetail };
}

/**
 * Build a stock movement record for a transfer between warehouses.
 */
export function buildTransferMovement(companyId, itemId, fromId, toId, quantity, notes) {
  return {
    company_id: companyId,
    item_id: itemId,
    from_warehouse_id: fromId,
    to_warehouse_id: toId,
    quantity,
    movement_type: "transfer",
    notes: notes || `Transferred ${quantity} units`,
  };
}

/**
 * Build a stock movement record for stock in/out (invoice/bill).
 */
export function buildStockMovement(companyId, itemId, warehouseId, quantity, type, reference) {
  return {
    company_id: companyId,
    item_id: itemId,
    from_warehouse_id: type === "out" ? warehouseId : null,
    to_warehouse_id: type === "in" ? warehouseId : null,
    quantity: Math.abs(quantity),
    movement_type: type,
    reference,
  };
}
