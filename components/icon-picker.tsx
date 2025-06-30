"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import type {LucideIcon} from "lucide-react";
import {
  MousePointer,
  MousePointer2,
  Hand,
  Pointer,
  MousePointerClickIcon as Click,
  Type,
  Keyboard,
  Edit,
  Edit3,
  PenToolIcon,
  FileText,
  Navigation,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Home,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Scan,
  Settings,
  Wrench,
  Cog,
  PowerIcon as Gear,
  Zap,
  Clock,
  Timer,
  Code,
  Code2,
  Terminal,
  Cpu,
  Database,
  Server,
  Cloud,
  Play,
  Pause,
  CircleStopIcon as Stop,
  RotateCcw,
  RotateCw,
  RefreshCwIcon as Refresh,
  Download,
  Upload,
  Star,
  Heart,
  Bookmark,
  Flag,
  Tag,
  Hash,
  AtSign,
  Percent,
} from "lucide-react";

const iconCategories = {
  click: [MousePointer, MousePointer2, Hand, Pointer, Click],
  input: [Type, Keyboard, Edit, Edit3, PenToolIcon, FileText],
  navigation: [Navigation, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Home, ExternalLink],
  verification: [Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Search, Scan],
  utility: [Settings, Wrench, Cog, Gear, Zap, Clock, Timer],
  custom: [Code, Code2, Terminal, Cpu, Database, Server, Cloud],
  general: [
    Play,
    Pause,
    Stop,
    RotateCcw,
    RotateCw,
    Refresh,
    Download,
    Upload,
    Star,
    Heart,
    Bookmark,
    Flag,
    Tag,
    Hash,
    AtSign,
    Percent,
  ],
};

interface IconPickerProps {
  selectedIcon: LucideIcon;
  onIconSelect: (icon: LucideIcon) => void;
  category?: string;
}

export function IconPicker({selectedIcon, onIconSelect, category}: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  const getRelevantIcons = () => {
    if (showAll || !category) {
      return Object.values(iconCategories).flat();
    }

    const categoryIcons = iconCategories[category as keyof typeof iconCategories] || [];
    const generalIcons = iconCategories.general.slice(0, 8);

    return [...categoryIcons, ...generalIcons];
  };

  const filteredIcons = getRelevantIcons().filter((icon) => {
    const iconName = icon.displayName || icon.name || "";
    return iconName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-3">
      {/* Current Selection */}
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
        {selectedIcon && (() => {
          const SelectedIcon = selectedIcon;
          return <SelectedIcon className="w-5 h-5 text-gray-700"/>;
        })()}
        <span className="text-sm font-medium">
          Selected:{" "}
          {selectedIcon ? selectedIcon.displayName || selectedIcon.name || "Unnamed" : "None"}
        </span>
      </div>


      {/* Search */}
      <Input
        placeholder="Search icons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="text-sm"
      />

      {/* Category Toggle */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          {showAll
            ? "All Icons"
            : `${category ? `${category.charAt(0).toUpperCase() + category.slice(1)} ` : ""}Icons`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="text-xs"
        >
          {showAll ? "Show Category" : "Show All"}
        </Button>
      </div>

      {/* Icon Grid */}
      <ScrollArea className="h-48 border rounded-lg p-2">
        <div className="grid grid-cols-8 gap-1">
          {filteredIcons.map((Icon, index) => {
            const name = Icon.displayName || Icon.name || `icon-${index}`;
            return (
              <Button
                key={`${name}-${index}`}
                variant={Icon === selectedIcon ? "default" : "ghost"}
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => onIconSelect(Icon)}
                title={name}
              >
                <Icon className="w-4 h-4"/>
              </Button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No icons found for &quot;{searchTerm}&quot;
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-gray-500">{filteredIcons.length} icons available</p>
    </div>
  );
}
