import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SavedViewsMenu({ currentFilters, onLoad }) {
  const [views, setViews] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);

  const load = () => base44.entities.SavedView.list("-created_date", 50).then(setViews);

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a view name"); return; }
    await base44.entities.SavedView.create({ name: name.trim(), filters: currentFilters, is_shared: isShared });
    toast.success("View saved");
    setSaveOpen(false);
    setName("");
    load();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await base44.entities.SavedView.delete(id);
    toast.success("View deleted");
    load();
  };

  const handleLoad = (view) => {
    onLoad(view.filters);
    toast.success(`Loaded: ${view.name}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
            <Bookmark className="w-3 h-3" />Views<ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setSaveOpen(true)} className="text-xs gap-2">
            <Plus className="w-3 h-3" /> Save current view…
          </DropdownMenuItem>
          {views.length > 0 && <DropdownMenuSeparator />}
          {views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onClick={() => handleLoad(v)}
              className="text-xs flex items-center justify-between group"
            >
              <span className="flex-1 truncate">{v.name}{v.is_shared && <span className="ml-1 text-gray-400">(shared)</span>}</span>
              <button
                onClick={(e) => handleDelete(v.id, e)}
                className="hidden group-hover:flex p-0.5 rounded hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Save Current View</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="View name (e.g. EMEA QTD Paid)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
              Share with all users
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}