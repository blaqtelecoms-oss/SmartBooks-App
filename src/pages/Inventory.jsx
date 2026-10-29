import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Package, Warehouse, ArrowRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { calculateStockValuation } from "@/lib/inventoryManager";

export default function Inventory() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemDialog, setItemDialog] = useState(false);
  const [whDialog, setWhDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ sku: "", name: "", description: "", unit_cost: 0, selling_price: 0, reorder_level: 0 });
  const [whForm, setWhForm] = useState({ name: "", location: "" });
  const [transferForm, setTransferForm] = useState({ item_id: "", from: "", to: "", quantity: 1 });

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [i, w, s] = await Promise.all([
        db.entities.InventoryItem.filter({ company_id: currentCompany.id }),
        db.entities.Warehouse.filter({ company_id: currentCompany.id }),
        db.entities.WarehouseStock.list(),
      ]);
      setItems(i);
      setWarehouses(w);
      setStock(s);
    } catch (e) {}
    setLoading(false);
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const handleSaveItem = async () => {
    if (!itemForm.sku || !itemForm.name) {
      toast({ title: "SKU and name are required", variant: "destructive" });
      return;
    }
    try {
      const payload = { company_id: currentCompany.id, ...itemForm, unit_cost: Number(itemForm.unit_cost) || 0, selling_price: Number(itemForm.selling_price) || 0, reorder_level: parseInt(itemForm.reorder_level) || 0 };
      if (editingItem) {
        await db.entities.InventoryItem.update(editingItem, payload);
      } else {
        await db.entities.InventoryItem.create(payload);
      }
      setItemDialog(false);
      setEditingItem(null);
      setItemForm({ sku: "", name: "", description: "", unit_cost: 0, selling_price: 0, reorder_level: 0 });
      await loadData();
      toast({ title: editingItem ? "Item updated" : "Item created" });
    } catch (e) {
      toast({ title: "Error saving item", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveWarehouse = async () => {
    if (!whForm.name) {
      toast({ title: "Warehouse name is required", variant: "destructive" });
      return;
    }
    try {
      await db.entities.Warehouse.create({ company_id: currentCompany.id, ...whForm });
      setWhDialog(false);
      setWhForm({ name: "", location: "" });
      await loadData();
      toast({ title: "Warehouse created" });
    } catch (e) {
      toast({ title: "Error creating warehouse", description: e.message, variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.item_id || !transferForm.from || !transferForm.to || transferForm.from === transferForm.to) {
      toast({ title: "Select item and different warehouses", variant: "destructive" });
      return;
    }
    try {
      // Record the movement
      await db.entities.StockMovement.create({
        company_id: currentCompany.id,
        item_id: transferForm.item_id,
        from_warehouse_id: transferForm.from,
        to_warehouse_id: transferForm.to,
        quantity: Number(transferForm.quantity) || 1,
        movement_type: "transfer",
        notes: `Manual transfer`,
      });
      // Update stock: deduct from source, add to destination
      const fromStock = stock.find(s => s.warehouse_id === transferForm.from && s.item_id === transferForm.item_id);
      const toStock = stock.find(s => s.warehouse_id === transferForm.to && s.item_id === transferForm.item_id);
      const qty = Number(transferForm.quantity) || 1;
      if (fromStock) {
        await db.entities.WarehouseStock.update(fromStock.id, { quantity: Math.max(0, (fromStock.quantity || 0) - qty) });
      }
      if (toStock) {
        await db.entities.WarehouseStock.update(toStock.id, { quantity: (toStock.quantity || 0) + qty });
      } else {
        await db.entities.WarehouseStock.create({ warehouse_id: transferForm.to, item_id: transferForm.item_id, quantity: qty });
      }
      setTransferDialog(false);
      setTransferForm({ item_id: "", from: "", to: "", quantity: 1 });
      await loadData();
      toast({ title: "Stock transferred" });
    } catch (e) {
      toast({ title: "Error transferring stock", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await db.entities.InventoryItem.delete(id);
      await loadData();
      toast({ title: "Item deleted" });
    } catch (e) {}
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  const valuation = calculateStockValuation(items, stock);
  const lowStockItems = valuation.perItem.filter(i => i.low_stock);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Inventory & Warehouses</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Manage stock items, warehouses, and transfers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setTransferDialog(true)} variant="outline" className="text-[13px] h-9 rounded-lg">
            <ArrowRight size={14} className="mr-1.5" /> Transfer
          </Button>
          <Button onClick={() => setWhDialog(true)} variant="outline" className="text-[13px] h-9 rounded-lg">
            <Warehouse size={14} className="mr-1.5" /> Warehouse
          </Button>
          <Button onClick={() => { setEditingItem(null); setItemForm({ sku: "", name: "", description: "", unit_cost: 0, selling_price: 0, reorder_level: 0 }); setItemDialog(true); }}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            <Plus size={14} className="mr-1.5" /> Add Item
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Total Items</p>
          <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Warehouses</p>
          <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{warehouses.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Stock Value (Cost)</p>
          <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{formatR(valuation.totalCost)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${lowStockItems.length > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-[#E5E5E8]"}`}>
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Low Stock Alerts</p>
          <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{lowStockItems.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("items")} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "items" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:bg-[#F7F7FA]"}`}>Items</button>
        <button onClick={() => setTab("warehouses")} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "warehouses" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:bg-[#F7F7FA]"}`}>Warehouses</button>
        <button onClick={() => setTab("valuation")} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "valuation" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:bg-[#F7F7FA]"}`}>Valuation</button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : tab === "items" ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
              <p className="text-[15px] font-medium text-[#0F0F0F]">No inventory items yet</p>
              <p className="text-[13px] text-[#6B6B72] mt-1">Add stock items to track quantities and valuation</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E5E8]">
                    <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">SKU</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Name</th>
                    <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Unit Cost</th>
                    <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Sell Price</th>
                    <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Reorder</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.perItem.map(item => (
                    <tr key={item.id} className={`border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors ${item.low_stock ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3 font-medium text-[#0F0F0F]">{item.sku}</td>
                      <td className="px-4 py-3 text-[#0F0F0F]">{item.name}</td>
                      <td className="px-4 py-3 text-right text-[#6B6B72]">{formatR(item.unit_cost)}</td>
                      <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(item.selling_price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={item.low_stock ? "text-amber-600 font-semibold flex items-center justify-end gap-1" : "text-[#0F0F0F]"}>
                          {item.low_stock && <AlertTriangle size={12} />}
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#6B6B72]">{item.reorder_level}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditingItem(item.id); const it = items.find(i => i.id === item.id); setItemForm({ sku: it.sku, name: it.name, description: it.description || "", unit_cost: it.unit_cost, selling_price: it.selling_price, reorder_level: it.reorder_level }); setItemDialog(true); }} className="text-[#6B6B72] hover:text-[#0F0F0F] p-1 mr-1 text-[12px]">Edit</button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-[#6B6B72] hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === "warehouses" ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          {warehouses.length === 0 ? (
            <div className="p-12 text-center">
              <Warehouse size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
              <p className="text-[15px] font-medium text-[#0F0F0F]">No warehouses yet</p>
              <p className="text-[13px] text-[#6B6B72] mt-1">Add warehouses to track stock across locations</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E5E8]">
                    <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Location</th>
                    <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Items</th>
                    <th className="text-center px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map(wh => {
                    const itemCount = stock.filter(s => s.warehouse_id === wh.id && s.quantity > 0).length;
                    return (
                      <tr key={wh.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#0F0F0F]">{wh.name}</td>
                        <td className="px-4 py-3 text-[#6B6B72]">{wh.location || "—"}</td>
                        <td className="px-4 py-3 text-right text-[#6B6B72]">{itemCount}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${wh.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{wh.is_active ? "Active" : "Inactive"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E8]">
            <p className="text-[14px] font-medium text-[#0F0F0F]">Stock Valuation Report</p>
            <p className="text-[12px] text-[#6B6B72] mt-0.5">Total cost value: {formatR(valuation.totalCost)} · Total retail value: {formatR(valuation.totalRetail)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Total Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Total Retail</th>
                </tr>
              </thead>
              <tbody>
                {valuation.perItem.map(item => (
                  <tr key={item.id} className="border-b border-[#F1F1F4]">
                    <td className="px-4 py-3 font-medium text-[#0F0F0F]">{item.sku}</td>
                    <td className="px-4 py-3 text-[#0F0F0F]">{item.name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-[#6B6B72]">{formatR(item.unit_cost)}</td>
                    <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(item.total_cost)}</td>
                    <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(item.total_retail)}</td>
                  </tr>
                ))}
                <tr className="bg-[#F7F7FA] font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-[#6B6B72]">Totals</td>
                  <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(valuation.totalCost)}</td>
                  <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(valuation.totalRetail)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">SKU</Label><Input value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} className="mt-1 text-[13px]" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Name</Label><Input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="mt-1 text-[13px]" /></div>
            </div>
            <div><Label className="text-[12px] text-[#6B6B72]">Description</Label><Input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="mt-1 text-[13px]" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Unit Cost (R)</Label><Input type="number" value={itemForm.unit_cost} onChange={e => setItemForm({ ...itemForm, unit_cost: e.target.value })} className="mt-1 text-[13px]" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Sell Price (R)</Label><Input type="number" value={itemForm.selling_price} onChange={e => setItemForm({ ...itemForm, selling_price: e.target.value })} className="mt-1 text-[13px]" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Reorder Level</Label><Input type="number" value={itemForm.reorder_level} onChange={e => setItemForm({ ...itemForm, reorder_level: e.target.value })} className="mt-1 text-[13px]" /></div>
            </div>
            <Button onClick={handleSaveItem} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">{editingItem ? "Update Item" : "Create Item"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouse dialog */}
      <Dialog open={whDialog} onOpenChange={setWhDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[16px]">Add Warehouse</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-[12px] text-[#6B6B72]">Name</Label><Input value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })} className="mt-1 text-[13px]" placeholder="Main Warehouse" /></div>
            <div><Label className="text-[12px] text-[#6B6B72]">Location</Label><Input value={whForm.location} onChange={e => setWhForm({ ...whForm, location: e.target.value })} className="mt-1 text-[13px]" placeholder="Johannesburg, Gauteng" /></div>
            <Button onClick={handleSaveWarehouse} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">Create Warehouse</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">Transfer Stock</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Item</Label>
              <Select value={transferForm.item_id} onValueChange={v => setTransferForm({ ...transferForm, item_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] text-[#6B6B72]">From Warehouse</Label>
                <Select value={transferForm.from} onValueChange={v => setTransferForm({ ...transferForm, from: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">To Warehouse</Label>
                <Select value={transferForm.to} onValueChange={v => setTransferForm({ ...transferForm, to: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-[12px] text-[#6B6B72]">Quantity</Label><Input type="number" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })} className="mt-1 text-[13px]" /></div>
            <Button onClick={handleTransfer} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">Transfer Stock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
