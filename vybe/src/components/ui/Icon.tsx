import {
  Activity, ArrowLeft, BarChart3, BookOpen, Bot, Brain, CalendarCheck, Check, ChevronRight, Coffee, Coins, Crown, Download, Dumbbell, Flame, Footprints, Gem, Globe,
  Hexagon, Home, Infinity as InfinityIcon, Lightbulb, Lock, Medal, MessageCircle, Minus, Moon, MoreHorizontal, Music, Orbit, Palette, PenLine, PiggyBank, PieChart, Plus, Repeat,
  Settings, Share2, Shield, Snowflake, Sparkles, Sprout, Star, Sun, Sunrise, Swords, Target, Trash2, Trophy, Upload, User, Users, Wallet, X, Zap, Heart, Bell, Pencil, Send, Snowflake as Freeze,
  Bike, Droplets, Leaf, Code, Camera, VolumeX, Volume2, Gamepad2, Video, Search, AtSign, ExternalLink, Play, Hand, Scissors, Square, Circle, MessagesSquare, Grid3x3, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  Activity, ArrowLeft, BarChart3, BookOpen, Bot, Brain, CalendarCheck, Check, ChevronRight, Coffee, Coins, Crown, Download, Dumbbell, Flame, Footprints, Gem, Globe,
  Hexagon, Home, Infinity: InfinityIcon, Lightbulb, Lock, Medal, MessageCircle, Minus, Moon, MoreHorizontal, Music, Orbit, Palette, PenLine, PiggyBank, PieChart, Plus, Repeat,
  Settings, Share2, Shield, Snowflake, Sparkles, Sprout, Star, Sun, Sunrise, Swords, Target, Trash2, Trophy, Upload, User, Users, Wallet, X, Zap, Heart, Bell, Pencil, Send, Freeze,
  Bike, Droplets, Leaf, Code, Camera, VolumeX, Volume2, Gamepad2, Video, Search, AtSign, ExternalLink, Play, Hand, Scissors, Square, Circle, MessagesSquare, Grid3x3,
};

/** Icons offered when creating a habit */
export const HABIT_ICONS = ['BookOpen', 'Dumbbell', 'Sunrise', 'PenLine', 'Droplets', 'Bike', 'Brain', 'Coffee', 'Moon', 'Leaf', 'Music', 'Code', 'Camera', 'Heart', 'Wallet', 'Users'];

export function Icon({ name, className, size = 18, strokeWidth = 1.8 }: { name: string; className?: string; size?: number; strokeWidth?: number }) {
  const C = ICONS[name] ?? Sparkles;
  return <C className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export const ATTR_ICON: Record<string, string> = {
  discipline: 'Shield', intelligence: 'Brain', fitness: 'Dumbbell', finance: 'Coins', creativity: 'Palette', social: 'Users',
};
/** Distinct, accessible hues per attribute (RGB triplets) */
export const ATTR_COLOR: Record<string, string> = {
  discipline: '167 139 250', intelligence: '96 165 250', fitness: '52 211 153', finance: '251 191 36', creativity: '244 114 182', social: '34 211 238',
};
