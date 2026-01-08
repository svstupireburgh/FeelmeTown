"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useId, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Loader2,
  Save,
  Users,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Info,
  ClipboardList,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import MoviesModal from "@/components/MoviesModal";
import GlobalDatePicker from "@/components/GlobalDatePicker";

type ServiceItem = {
  id?: string;
  name: string;
  price?: number;
  quantity?: number;
  imageUrl?: string;
  image?: string;
  categoryName?: string;
  pricingMode?: 'single' | 'half-full' | 'three-size';
  halfPrice?: number;
  fullPrice?: number;
  smallPrice?: number;
  mediumPrice?: number;
  largePrice?: number;
  variantLabel?: string;
  vegType?: 'veg' | 'non-veg';
};

const formatDateDisplayValue = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

type OccasionOption = {
  _id: string;
  occasionId?: string;
  name: string;
  requiredFields: string[];
  fieldLabels: Record<string, string>;
  icon?: string;
  isActive?: boolean;
  includeInDecoration?: boolean;
};

type BookingFormState = {
  bookingId: string;
  mongoId?: string;
  customerName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  theaterName: string;
  date: string;
  time: string;
  numberOfPeople: number;
  occasion: string;
  occasionData: Record<string, string>;
  notes: string;
  adminNotes: string;
  status: string;
  paymentStatus: string;
  venuePaymentMethod: string;
  totalAmount: string;
  advancePayment: string;
  venuePayment: string;
  decorationFee: string;
  penaltyCharges: string;
  penaltyReason: string;
  adminDiscount: string;
  discount: string;
  couponCode: string;
  paidBy: string;
  paidAt: string;
  bookingType: string;
  isManualBooking: boolean;
  createdBy: string;
  staffName: string;
  staffId: string;
  selectedMovies: ServiceItem[];
  selectedCakes: ServiceItem[];
  selectedDecorItems: ServiceItem[];
  selectedGifts: ServiceItem[];
  selectedExtraAddOns: ServiceItem[];
  pricingData: Record<string, unknown> | null;
  [key: string]: any;
};

type ServiceFieldName = string;

const isFoodServiceName = (name?: string) => {
  const v = String(name || '').toLowerCase();
  return /(food|menu|snack|beverage|drink|starter|main\s*course|dessert|catering)/i.test(v);
};

const resolveVegType = (value: any): 'veg' | 'non-veg' => (value === 'non-veg' ? 'non-veg' : 'veg');

const VegBadge = ({ vegType = 'veg' }: { vegType?: 'veg' | 'non-veg' }) => {
  const type = resolveVegType(vegType);
  return (
    <span className={`veg-badge ${type}`}>
      <span className="veg-badge__dot" />
      {type === 'veg' ? 'Veg' : 'Non Veg'}
    </span>
  );
};

const getServiceLookupKey = (serviceName: string) => {
  const s = String(serviceName || "").trim().toLowerCase();
  if (s.includes("cake")) return "cakes";
  if (s.includes("decor")) return "decor";
  if (s.includes("gift")) return "gifts";
  if (s.includes("movie")) return "movies";
  if (s.includes("extra") || s.includes("add-on") || s.includes("addon") || s.includes("add on")) {
    return "extraAddOns";
  }
  return s.replace(/[^a-z0-9]/g, "");
};

const buildDynamicFieldName = (serviceName: string): ServiceFieldName => {
  const key = getServiceLookupKey(serviceName);
  if (key === "cakes") return "selectedCakes";
  if (key === "decor") return "selectedDecorItems";
  if (key === "gifts") return "selectedGifts";
  if (key === "movies") return "selectedMovies";
  if (key === "extraAddOns") return "selectedExtraAddOns";

  const raw = String(serviceName || "").trim();
  const collapsed = raw.replace(/\s+/g, "");
  if (!collapsed) return "selectedExtraAddOns";
  return `selected${collapsed}`;
};

const getServiceFieldName = (serviceName: string): ServiceFieldName => {
  return buildDynamicFieldName(serviceName);
};

const deriveLookupKeyFromField = (fieldName: string): string => {
  if (!fieldName.startsWith("selected")) return "";
  const suffixRaw = fieldName.slice("selected".length);
  if (!suffixRaw) return "";
  const normalized = suffixRaw.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("cake")) return "cakes";
  if (normalized.includes("decor")) return "decor";
  if (normalized.includes("gift")) return "gifts";
  if (normalized.includes("movie")) return "movies";
  if (normalized.includes("extra") || normalized.includes("addon")) {
    return "extraAddOns";
  }
  return normalized;
};

const cleanMediaUrl = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^`+|`+$/g, "").replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
};

const formatCreatedByValue = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const raw: any = value as any;
  const type = String(raw.type || "").toLowerCase();

  if (type === "admin") {
    return `Admin: ${raw.adminName || "Administrator"}`;
  }

  if (type === "staff") {
    return "Staff";
  }

  if (type === "customer") {
    return "Customer";
  }

  if (raw.adminName) {
    return `Admin: ${raw.adminName}`;
  }

  if (raw.staffName) {
    return "Staff";
  }

  return "";
};

const extractNumericValue = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return undefined;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

type SelectedServiceMeta = {
  key: string;
  fieldName: string;
  items: ServiceItem[];
};

const displayNameFromSelectedField = (fieldName: string): string => {
  const suffix = fieldName.replace(/^selected/, "");
  if (!suffix) return "Service";
  const withSpaces = suffix
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!withSpaces) return "Service";
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const extractSelectedServiceMeta = (form: BookingFormState | null | undefined): SelectedServiceMeta[] => {
  if (!form) return [];
  const meta: SelectedServiceMeta[] = [];
  Object.keys(form).forEach((fieldName) => {
    if (!fieldName.startsWith("selected")) return;
    const value = (form as any)[fieldName];
    if (!Array.isArray(value) || value.length === 0) return;
    const key = deriveLookupKeyFromField(fieldName);
    if (!key) return;
    meta.push({ key, fieldName, items: value });
  });
  return meta;
};

const buildSelectedServiceMetaFromForm = (form: BookingFormState): SelectedServiceMeta[] => {
  try {
    const entries = Object.keys(form).reduce<SelectedServiceMeta[]>((acc, key) => {
      if (!key.startsWith("selected")) return acc;
      const value = (form as any)[key];
      if (!Array.isArray(value) || value.length === 0) return acc;
      const lookupKey = deriveLookupKeyFromField(key);
      if (!lookupKey) return acc;
      acc.push({ key: lookupKey, fieldName: key, items: value });
      return acc;
    }, []);
    return entries;
  } catch {
    return [];
  }
};

const normalizeServicesForEditor = (
  services: any[],
  selectedMeta: SelectedServiceMeta[],
): any[] => {
  const selectedKeys = new Set(selectedMeta.map((meta) => meta.key));

  const normalized = services
    .map((service) => {
      if (!service) return null;
      const name = service.name || service.displayName || "Service";
      const lookupKey = getServiceLookupKey(name);
      const fieldName = buildDynamicFieldName(name);
      const shouldDisplay = service.isActive !== false;
      const forceDisplay = selectedKeys.has(lookupKey);
      const normalizedItems = Array.isArray(service.items)
        ? service.items.map((item: any) => {
            const primaryImage = cleanMediaUrl(item.imageUrl || item.image);
            const backupImage = cleanMediaUrl(item.image || item.imageUrl);
            const priceValue = extractNumericValue(
              item.price ?? item.cost ?? item.amount ?? item.fullPrice ?? item.halfPrice ?? item.largePrice ?? item.mediumPrice ?? item.smallPrice,
            );
            return {
              ...item,
              imageUrl: primaryImage || backupImage || item.imageUrl || item.image || "",
              image: primaryImage || backupImage || item.image || item.imageUrl || "",
              showTag: item.showTag ?? false,
              price: priceValue ?? item.price ?? item.cost ?? item.amount ?? null,
            };
          })
        : [];

      return {
        ...service,
        name,
        items: normalizedItems,
        includeInDecoration: service.includeInDecoration ?? false,
        compulsory: service.compulsory ?? false,
        itemTagEnabled: service.itemTagEnabled ?? false,
        itemTagName: service.itemTagName ?? "",
        showInBookingPopup: service.showInBookingPopup ?? true,
        __lookupKey: lookupKey,
        __fieldName: fieldName,
        __shouldDisplay: shouldDisplay || forceDisplay,
      };
    })
    .filter(Boolean)
    .filter((service: any) => service.__shouldDisplay !== false);

  const presentKeys = new Set(normalized.map((service: any) => service.__lookupKey));

  selectedMeta.forEach(({ key, fieldName, items }) => {
    if (!key || presentKeys.has(key)) return;
    const displayName = displayNameFromSelectedField(fieldName);
    const placeholderItems = items.map((item) => ({
      ...item,
      imageUrl: (item as any).imageUrl || (item as any).image || "",
      image: (item as any).image || (item as any).imageUrl || "",
      showTag: (item as any).showTag ?? false,
    }));

    normalized.push({
      serviceId: fieldName,
      name: displayName,
      items: placeholderItems,
      isActive: false,
      includeInDecoration: false,
      compulsory: false,
      itemTagEnabled: false,
      itemTagName: "",
      showInBookingPopup: false,
      __lookupKey: key,
      __fieldName: fieldName,
      __shouldDisplay: true,
    });
    presentKeys.add(key);
  });

  return normalized;
};

const resolveServiceLookupKey = (service: any): string => {
  if (service && typeof service.__lookupKey === "string" && service.__lookupKey) {
    return service.__lookupKey;
  }
  return getServiceLookupKey(String(service?.name || ""));
};

const resolveServiceFieldName = (service: any): ServiceFieldName => {
  if (service && typeof service.__fieldName === "string" && service.__fieldName) {
    return service.__fieldName;
  }
  return getServiceFieldName(String(service?.name || ""));
};

const resolveServiceCatalogItem = (service: any, selected: ServiceItem): any | null => {
  if (!service || !Array.isArray(service.items)) return null;
  const targetId = selected.id;
  const targetName = (selected.name || "").toString().toLowerCase();
  return (
    service.items.find((item: any) => {
      const itemId = item.id || item._id || item.itemId;
      if (targetId && itemId && targetId === itemId) return true;
      const itemName = (item.name || item.title || "").toString().toLowerCase();
      return !!targetName && targetName === itemName;
    }) || null
  );
};

const resolveSelectedItemImage = (service: any, selected: ServiceItem): string => {
  const catalogItem = resolveServiceCatalogItem(service, selected) || {};
  const candidates = [
    (catalogItem as any).imageUrl,
    (catalogItem as any).image,
    (selected as any).imageUrl,
    (selected as any).image,
  ];
  for (const candidate of candidates) {
    const cleaned = cleanMediaUrl(candidate);
    if (cleaned) return cleaned;
  }
  return "";
};

const emptyForm: BookingFormState = {
  bookingId: "",
  customerName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  theaterName: "",
  date: "",
  time: "",
  numberOfPeople: 2,
  occasion: "",
  occasionData: {},
  notes: "",
  adminNotes: "",
  status: "pending",
  paymentStatus: "unpaid",
  venuePaymentMethod: "online",
  totalAmount: "",
  advancePayment: "",
  venuePayment: "",
  decorationFee: "",
  penaltyCharges: "",
  penaltyReason: "",
  adminDiscount: "",
  discount: "",
  couponCode: "",
  paidBy: "",
  paidAt: "",
  bookingType: "online",
  isManualBooking: false,
  createdBy: "",
  staffName: "",
  staffId: "",
  selectedMovies: [],
  selectedCakes: [],
  selectedDecorItems: [],
  selectedGifts: [],
  selectedExtraAddOns: [],
  pricingData: null,
};

const statusOptions = [
  "pending",
  "manual",
  "confirmed",
  "completed",
  "cancelled",
  "incomplete",
];

const paymentStatusOptions = ["unpaid", "paid", "partial", "refunded"];

const paymentMethodOptions = ["online", "cash", "upi", "card", "bank-transfer"];
const bookingTypeOptions = ["online", "manual", "admin"];

const toDisplayLabel = (value: string) =>
  value
    .split(/[-_]/g)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatCurrencyInput = (value: string | number) => {
  if (typeof value === "number") return value.toString();
  if (!value) return "";
  return value;
};

const parseCurrencyValue = (value: string | number | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateVenuePayment = (
  totalValue: string | number | null | undefined,
  advanceValue: string | number | null | undefined,
): number => {
  const total = parseCurrencyValue(totalValue);
  const advance = parseCurrencyValue(advanceValue);
  const remainder = total - advance;
  return remainder > 0 ? remainder : 0;
};

const extractTheaterBasePrice = (theater: any): number => {
  if (!theater || typeof theater !== "object") return 0;

  const pricing = typeof theater.pricing === "object" && theater.pricing !== null ? theater.pricing : {};
  const candidates: unknown[] = [
    theater.basePrice,
    theater.price,
    theater.startingPrice,
    theater.baseAmount,
    theater.minimumPrice,
    theater.defaultPrice,
    (pricing as any)?.basePrice,
    (pricing as any)?.defaultPrice,
  ];

  for (const candidate of candidates) {
    const amount = parseCurrencyValue(candidate as any);
    if (amount > 0) {
      return amount;
    }
  }

  return 0;
};

const normalizePhone = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/[^\d]/g, "");
};

const normalizeItem = (raw: any): ServiceItem => {
  if (!raw) {
    return { name: "", quantity: 1, price: undefined };
  }

  if (typeof raw === "string") {
    return { name: raw, quantity: 1 };
  }

  return {
    id: raw.id || raw.itemId || raw._id || undefined,
    name: raw.name || raw.title || raw.displayName || raw.itemName || "",
    imageUrl: raw.imageUrl || raw.image || undefined,
    image: raw.image || raw.imageUrl || undefined,
    categoryName: raw.categoryName || undefined,
    pricingMode: raw.pricingMode || undefined,
    halfPrice: extractNumericValue(raw.halfPrice),
    fullPrice: extractNumericValue(raw.fullPrice),
    smallPrice: extractNumericValue(raw.smallPrice),
    mediumPrice: extractNumericValue(raw.mediumPrice),
    largePrice: extractNumericValue(raw.largePrice),
    variantLabel: raw.variantLabel || undefined,
    vegType: raw.vegType === 'non-veg' ? 'non-veg' : raw.vegType === 'veg' ? 'veg' : undefined,
    price: (() => {
      const rawValue = raw.price ?? raw.cost ?? raw.amount;
      if (typeof rawValue === "number") {
        return Number.isFinite(rawValue) ? rawValue : undefined;
      }
      if (rawValue) {
        const cleaned = String(rawValue).replace(/[^0-9.-]/g, "");
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    })(),
    quantity:
      raw.quantity && Number(raw.quantity) > 0
        ? Number(raw.quantity)
        : raw.qty && Number(raw.qty) > 0
        ? Number(raw.qty)
        : 1,
  };
};

const parseDateValue = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const verboseMatch = trimmed.match(
    /^(?:[A-Za-z]+\s*,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/i
  );
  if (verboseMatch) {
    const [, monthName, day, year] = verboseMatch;
    const months: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    const monthIndex = months[monthName.toLowerCase()];
    if (typeof monthIndex === "number") {
      return new Date(Number(year), monthIndex, Number(day));
    }
  }

  const sanitized = trimmed.replace(/^[A-Za-z]+\s*,\s*/, "").split(" at ")[0]?.trim();
  if (sanitized) {
    const fallback = new Date(sanitized);
    if (!Number.isNaN(fallback.getTime())) {
      return new Date(
        fallback.getFullYear(),
        fallback.getMonth(),
        fallback.getDate()
      );
    }
  }
  return null;
};

const formatDateInputValue = (date: Date): string => formatDateDisplayValue(date);

const ensureDisplayDateString = (value?: string | null): string => {
  if (!value) return "";
  const parsed = parseDateValue(value);
  if (!parsed) return value;
  return formatDateDisplayValue(parsed);
};

const normalizeTimeToken = (token?: string) => {
  if (!token) return undefined;
  const trimmed = token.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) {
    return trimmed.toUpperCase();
  }
  let hour = Number(match[1]);
  const minutes = match[2] ? String(match[2]).padStart(2, "0") : "00";
  const period = match[3].toUpperCase();
  if (hour === 0) hour = 12;
  if (hour > 12) hour = hour % 12 || 12;
  const hourStr = String(hour);
  return `${hourStr}:${minutes} ${period}`;
};

const formatTimeForStorageValue = (time?: string): string | undefined => {
  if (!time) return undefined;
  const trimmed = time.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("-")) {
    const [startRaw, endRaw] = trimmed.split("-").map((part) => part.trim());
    const start = normalizeTimeToken(startRaw);
    const end = normalizeTimeToken(endRaw);
    if (start && end) {
      return `${start} - ${end}`;
    }
  }
  const normalized = normalizeTimeToken(trimmed);
  return normalized || trimmed;
};

type CustomOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

const sanitizeForComparison = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
};

const OCCASION_FIELD_SYNONYMS: Record<string, string[]> = {
  partner1Name: ["yournickname", "partner1", "partner1name", "partnerone", "nickname", "yourname"],
  partner2Name: ["yourpartnersnickname", "partnernickname", "partner2", "partner2name", "partnertwo", "partnersnickname"],
  partner1Gender: ["partner1gender", "yourgender"],
  partner2Gender: ["partner2gender", "partnergender", "partnersgender"],
  dateNightName: ["datenightname"],
  proposerName: ["proposername"],
  proposalPartnerName: ["proposalpartnername", "partnername"],
  valentineName: ["valentinename"],
  customCelebration: ["customcelebration"],
};

const findClosestOccasionDefinition = (
  occasionName: string,
  occasionDefinitions: OccasionOption[],
): OccasionOption | null => {
  if (!occasionName) return null;
  const sanitizedTarget = sanitizeForComparison(occasionName);
  if (!sanitizedTarget) return null;

  let bestMatch: OccasionOption | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const definition of occasionDefinitions) {
    const sanitizedCandidate = sanitizeForComparison(definition.name);
    if (!sanitizedCandidate) continue;

    if (sanitizedCandidate === sanitizedTarget) {
      return definition;
    }

    const distance = levenshteinDistance(sanitizedTarget, sanitizedCandidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = definition;
    }
  }

  return bestDistance <= 2 ? bestMatch : null;
};

const formatINRCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const StyledDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Select option",
  disabled = false,
}: {
  value: string;
  options: CustomOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((opt) => opt.value === value)
    )
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  useEffect(() => {
    setHighlightedIndex((prev) => {
      const nextIndex = options.findIndex((opt) => opt.value === value);
      if (nextIndex === -1) {
        return Math.min(prev, options.length - 1);
      }
      return nextIndex;
    });
  }, [value, options]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !(event.target instanceof Node)) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.focus();
    }
  }, [open, highlightedIndex]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const findNextEnabledIndex = (startIndex: number, direction: 1 | -1) => {
    if (options.length === 0) return -1;
    let nextIndex = startIndex;
    for (let i = 0; i < options.length; i += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        return nextIndex;
      }
    }
    return startIndex;
  };

  const cycleHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((prev) => {
      if (prev === -1) {
        const initial = direction === 1 ? -1 : 0;
        const firstEnabled = findNextEnabledIndex(initial, direction);
        return firstEnabled;
      }
      const nextIndex = findNextEnabledIndex(prev, direction);
      return nextIndex;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      cycleHighlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && highlightedIndex >= 0) {
        selectValue(options[highlightedIndex].value);
      } else {
        setOpen((prev) => !prev);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const selected = options.find((opt) => opt.value === value);

  return (
    <div
      className={`styled-dropdown ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="styled-dropdown__toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <div className="styled-dropdown__value">
          {selected?.icon && <span className="option-icon">{selected.icon}</span>}
          <span>{selected?.label || placeholder}</span>
        </div>
        <ChevronDown size={16} aria-hidden className="chevron" />
      </button>

      <ul
        id={listId}
        className="styled-dropdown__list"
        role="listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
        }
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = highlightedIndex === index;
          const isBookedLabel =
            typeof option.label === "string" && option.label.toLowerCase().startsWith("slot booked");
          const isGoingLabel =
            typeof option.label === "string" && option.label.toLowerCase().startsWith("time gone");
          return (
            <li key={option.value}>
              <button
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                className={`styled-dropdown__option ${isSelected ? "selected" : ""} ${
                  isActive ? "active" : ""
                } ${option.disabled ? "disabled" : ""} ${isBookedLabel ? "booked" : ""} ${
                  isGoingLabel ? "going" : ""
                }`}
                aria-disabled={option.disabled || undefined}
                disabled={option.disabled}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => {
                  if (!option.disabled) {
                    selectValue(option.value);
                  }
                }}
              >
                <div className="option-content">
                  {option.icon && <span className="option-icon">{option.icon}</span>}
                  <span className="option-label">{option.label}</span>
                </div>
                {isSelected && <Check size={16} className="option-check" />}
              </button>
            </li>
          );
        })}
      </ul>
      <style jsx>{`
        .styled-dropdown { position: relative; }
        .styled-dropdown__toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--card-border); border-radius: 10px; padding: 10px 12px; }
        .styled-dropdown__list { margin-top: 8px; background: #0f0f0f; border: 1px solid var(--card-border); border-radius: 10px; padding: 6px; max-height: 280px; overflow-y: auto; }
        .styled-dropdown__option { width: 100%; text-align: left; border: none; background: transparent; color: var(--text-primary); padding: 10px 12px; border-radius: 8px; cursor: pointer; }
        .styled-dropdown__option.disabled { cursor: not-allowed; opacity: 0.9; }
        .styled-dropdown__option.active { background: rgba(255,255,255,0.06); }
        /* Selected (current choice) in green */
        .styled-dropdown__option.selected, .styled-dropdown__option.selected .option-label { color: #22c55e; }
        .styled-dropdown__option.selected { background: rgba(34,197,94,0.15); }
        /* Booked options in red */
        .styled-dropdown__option.booked .option-label { color: #ef4444; font-weight: 600; }
        .styled-dropdown__option.booked { background: rgba(239,68,68,0.10); }
        /* Time Gone in amber */
        .styled-dropdown__option.going .option-label { color: #f59e0b; font-weight: 600; }
      `}</style>
    </div>
  );
};

const CustomSelect = ({
  value,
  options,
  onChange,
  placeholder = "Select option",
  disabled = false,
}: {
  value: string;
  options: CustomOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((opt) => opt.value === value)
    )
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  useEffect(() => {
    setHighlightedIndex((prev) => {
      const nextIndex = options.findIndex((opt) => opt.value === value);
      if (nextIndex === -1) {
        return Math.min(prev, options.length - 1);
      }
      return nextIndex;
    });
  }, [value, options]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !(event.target instanceof Node)) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.focus();
    }
  }, [open, highlightedIndex]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const cycleHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((prev) => {
      if (prev === -1) return 0;
      const nextIndex = (prev + direction + options.length) % options.length;
      return nextIndex;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      cycleHighlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && highlightedIndex >= 0) {
        selectValue(options[highlightedIndex].value);
      } else {
        setOpen((prev) => !prev);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const selected = options.find((opt) => opt.value === value);

  return (
    <div
      className={`custom-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="custom-select__toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <div className="custom-select__value">
          {selected?.icon && <span className="option-icon">{selected.icon}</span>}
          <span>{selected?.label || placeholder}</span>
        </div>
        <ChevronDown size={16} aria-hidden className="chevron" />
      </button>

      <ul
        id={listId}
        className="custom-select__list"
        role="listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
        }
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = highlightedIndex === index;
          return (
            <li key={option.value}>
              <button
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                className={`custom-select__option ${isSelected ? "selected" : ""} ${
                  isActive ? "active" : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectValue(option.value)}
              >
                <div className="option-content">
                  {option.icon && <span className="option-icon">{option.icon}</span>}
                  <span className="option-label">{option.label}</span>
                </div>
                {isSelected && <Check size={16} className="option-check" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default function EditBookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 240 }} />}>
      <EditBookingPageInner />
    </Suspense>
  );
}

function EditBookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const staffUserRaw = typeof window !== "undefined" ? localStorage.getItem("staffUser") : null;
  const staffUser = (() => {
    if (!staffUserRaw) return null;
    try {
      return JSON.parse(staffUserRaw);
    } catch {
      return null;
    }
  })();
  const isViewOnlyStaff = staffUser?.role === "staff" && (staffUser?.bookingAccess || "view") !== "edit";
  const queryBookingId = searchParams.get("bookingId");
  const queryEmail = searchParams.get("email");
  const queryPhone = searchParams.get("phone");
  const queryMongoId = searchParams.get("mongoId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormState>(emptyForm);
  const [originalBooking, setOriginalBooking] = useState<any>(null);
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [theaters, setTheaters] = useState<any[]>([]);
  const [occasions, setOccasions] = useState<OccasionOption[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pricingData, setPricingData] = useState<Record<string, unknown> | null>(null);
  const [decorationEnabled, setDecorationEnabled] = useState(false);
  const [activeService, setActiveService] = useState<any | null>(null);
  const [selectedServiceLookup, setSelectedServiceLookup] = useState<Record<string, ServiceItem[]>>({});
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('ALL');
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantMenuItem, setVariantMenuItem] = useState<ServiceItem | null>(null);
  const [variantQty, setVariantQty] = useState<number>(1);
  const [variantSelectedKey, setVariantSelectedKey] = useState<string | null>(null);
  const [variantTargetService, setVariantTargetService] = useState<any | null>(null);
  const [customFoodModalOpen, setCustomFoodModalOpen] = useState(false);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodSizeKey, setCustomFoodSizeKey] = useState<'single' | 'half' | 'full' | 'small' | 'medium' | 'large'>('single');
  const [customFoodPrice, setCustomFoodPrice] = useState<string>('');
  const [customFoodQty, setCustomFoodQty] = useState<number>(1);
  const [customFoodTargetService, setCustomFoodTargetService] = useState<any | null>(null);
  const [selectedFoodModalOpen, setSelectedFoodModalOpen] = useState(false);
  const [selectedFoodTargetService, setSelectedFoodTargetService] = useState<any | null>(null);
  const [showMoviesModal, setShowMoviesModal] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const getFoodVariantOptions = (menuItem: ServiceItem): { key: string; label: string; price: number }[] => {
    const options: { key: string; label: string; price: number }[] = [];

    if (menuItem.pricingMode === 'half-full') {
      const half = extractNumericValue(menuItem.halfPrice);
      const full = extractNumericValue(menuItem.fullPrice);
      if (typeof half === 'number' && half > 0) options.push({ key: 'half', label: `Half ₹${half}`, price: half });
      if (typeof full === 'number' && full > 0) options.push({ key: 'full', label: `Full ₹${full}`, price: full });
    } else if (menuItem.pricingMode === 'three-size') {
      const small = extractNumericValue(menuItem.smallPrice);
      const medium = extractNumericValue(menuItem.mediumPrice);
      const large = extractNumericValue(menuItem.largePrice);
      if (typeof small === 'number' && small > 0) options.push({ key: 'small', label: `Small ₹${small}`, price: small });
      if (typeof medium === 'number' && medium > 0) options.push({ key: 'medium', label: `Medium ₹${medium}`, price: medium });
      if (typeof large === 'number' && large > 0) options.push({ key: 'large', label: `Full ₹${large}`, price: large });
    } else {
      const single = extractNumericValue(menuItem.price);
      if (typeof single === 'number' && single > 0) options.push({ key: 'single', label: `Price ₹${single}`, price: single });
    }

    return options;
  };

  const closeVariantSelectionModal = () => {
    setVariantModalOpen(false);
    setVariantMenuItem(null);
    setVariantSelectedKey(null);
    setVariantQty(1);
    setVariantTargetService(null);
  };

  const openCustomFoodModal = (targetService?: any) => {
    setCustomFoodTargetService(targetService || activeService);
    setCustomFoodName('');
    setCustomFoodSizeKey('single');
    setCustomFoodPrice('');
    setCustomFoodQty(1);
    setCustomFoodModalOpen(true);
  };

  const closeCustomFoodModal = () => {
    setCustomFoodModalOpen(false);
    setCustomFoodTargetService(null);
    setCustomFoodName('');
    setCustomFoodSizeKey('single');
    setCustomFoodPrice('');
    setCustomFoodQty(1);
  };

  const openSelectedFoodModal = (targetService?: any) => {
    setSelectedFoodTargetService(targetService || activeService);
    setSelectedFoodModalOpen(true);
  };

  const closeSelectedFoodModal = () => {
    setSelectedFoodModalOpen(false);
    setSelectedFoodTargetService(null);
  };

  const removeSelectedItemFromService = (service: any, selectedItem: ServiceItem) => {
    if (!service || !selectedItem) return;

    const serviceName = String(service?.name || '');
    const lookupKey = getServiceLookupKey(serviceName);
    const fieldName = getServiceFieldName(serviceName);

    setFormData((prev) => {
      const current = (prev[fieldName] || []) as ServiceItem[];
      const selectedId = String(selectedItem.id || '').trim();
      const selectedName = String(selectedItem.name || '').trim();

      const index = current.findIndex((it) => {
        const itId = String(it.id || '').trim();
        const itName = String(it.name || '').trim();
        if (selectedId && itId && itId === selectedId) return true;
        if (!selectedId && selectedName && itName === selectedName) return true;
        if (selectedId && !itId && selectedName && itName === selectedName) return true;
        return false;
      });

      if (index < 0) return prev;

      const removed = current[index];
      const next = [...current.slice(0, index), ...current.slice(index + 1)];

      const unitPrice = Number(removed?.price ?? 0) || 0;
      const qty = Number(removed?.quantity ?? 1) || 1;
      const rawTotal = parseCurrencyValue(prev.totalAmount);
      const currentTotal = Number.isFinite(rawTotal) ? rawTotal : 0;
      const nextTotal = Math.max(0, currentTotal - unitPrice * qty);
      const nextVenuePayment = calculateVenuePayment(nextTotal, prev.advancePayment);

      setSelectedServiceLookup((prevLookup) => ({
        ...prevLookup,
        [lookupKey]: next,
      }));

      void persistServiceSelections(fieldName, next, nextTotal, nextVenuePayment);

      return {
        ...prev,
        [fieldName]: next,
        totalAmount: String(nextTotal),
        venuePayment: String(nextVenuePayment),
      };
    });
  };

  const addCustomFoodToService = () => {
    const service = customFoodTargetService || activeService;
    if (!service) return;

    const rawName = String(customFoodName || '').trim();
    const unitPrice = Number(customFoodPrice);
    const qty = Number(customFoodQty || 1);

    if (!rawName) return;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

    const suffix =
      customFoodSizeKey === 'half'
        ? ' (Half)'
        : customFoodSizeKey === 'full'
        ? ' (Full)'
        : customFoodSizeKey === 'small'
        ? ' (Small)'
        : customFoodSizeKey === 'medium'
        ? ' (Medium)'
        : customFoodSizeKey === 'large'
        ? ' (Full)'
        : '';

    const normalizedName = `${rawName}${suffix}`;
    const idSlug = rawName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

    const nextItem: ServiceItem = {
      id: `other-${idSlug || 'item'}-${customFoodSizeKey}-${Date.now()}`,
      name: normalizedName,
      price: unitPrice,
      quantity: qty > 0 ? qty : 1,
      pricingMode: 'single',
      variantLabel: customFoodSizeKey,
      categoryName: 'Other',
    };

    const serviceName = String(service?.name || '');
    const lookupKey = getServiceLookupKey(serviceName);
    const fieldName = getServiceFieldName(serviceName);

    setFormData((prev) => {
      const current = (prev[fieldName] || []) as ServiceItem[];
      const next = [...current, nextItem];

      const rawTotal = parseCurrencyValue(prev.totalAmount);
      const currentTotal = Number.isFinite(rawTotal) ? rawTotal : 0;
      const delta = unitPrice * (Number(nextItem.quantity ?? 1) || 1);
      const nextTotal = Math.max(0, currentTotal + delta);
      const nextVenuePayment = calculateVenuePayment(nextTotal, prev.advancePayment);

      setSelectedServiceLookup((prevLookup) => ({
        ...prevLookup,
        [lookupKey]: next,
      }));

      void persistServiceSelections(fieldName, next, nextTotal, nextVenuePayment);

      return {
        ...prev,
        [fieldName]: next,
        totalAmount: String(nextTotal),
        venuePayment: String(nextVenuePayment),
      };
    });

    closeCustomFoodModal();
  };

  const addSelectedVariantToService = () => {
    if (!variantMenuItem || !variantSelectedKey || !variantTargetService) return;

    const options = getFoodVariantOptions(variantMenuItem);
    const chosen = options.find((opt) => opt.key === variantSelectedKey);
    if (!chosen) return;

    const idBase =
      String(variantMenuItem.id || '').trim() ||
      String(variantMenuItem.name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    const nextItem: ServiceItem = {
      ...variantMenuItem,
      id: `${idBase}-${chosen.key}`,
      name:
        chosen.key === 'half'
          ? `${variantMenuItem.name} (Half)`
          : chosen.key === 'full'
          ? `${variantMenuItem.name} (Full)`
          : chosen.key === 'small'
          ? `${variantMenuItem.name} (Small)`
          : chosen.key === 'medium'
          ? `${variantMenuItem.name} (Medium)`
          : chosen.key === 'large'
          ? `${variantMenuItem.name} (Full)`
          : variantMenuItem.name,
      price: chosen.price,
      quantity: variantQty > 0 ? variantQty : 1,
      variantLabel: chosen.key,
    };

    const serviceName = String(variantTargetService?.name || "");
    const lookupKey = getServiceLookupKey(serviceName);
    const fieldName = getServiceFieldName(serviceName);

    setFormData((prev) => {
      const current = (prev[fieldName] || []) as ServiceItem[];
      const next = [...current, nextItem];

      const unitPrice = Number(nextItem.price ?? 0) || 0;
      const qty = Number(nextItem.quantity ?? 1) || 1;
      const rawTotal = parseCurrencyValue(prev.totalAmount);
      const currentTotal = Number.isFinite(rawTotal) ? rawTotal : 0;
      const delta = unitPrice * qty;
      const nextTotal = Math.max(0, currentTotal + delta);
      const nextVenuePayment = calculateVenuePayment(nextTotal, prev.advancePayment);

      setSelectedServiceLookup((prevLookup) => ({
        ...prevLookup,
        [lookupKey]: next,
      }));

      void persistServiceSelections(fieldName, next, nextTotal, nextVenuePayment);

      return {
        ...prev,
        [fieldName]: next,
        totalAmount: String(nextTotal),
        venuePayment: String(nextVenuePayment),
      };
    });

    closeVariantSelectionModal();
  };
  const defaultDisplayDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );
  const [isManagementContext, setIsManagementContext] = useState(false);
  const loadedOccasionRef = useRef<string | null>(null);
  const decorationToggleManuallySetRef = useRef(false);
  const [editorMeta, setEditorMeta] = useState<{
    role: "admin" | "staff" | "unknown";
    name?: string;
    id?: string;
  }>({ role: "unknown" });

  const selectedOccasion = useMemo(() => {
    if (!formData.occasion) return null;
    return (
      occasions.find(
        (occ) => sanitizeForComparison(occ.name) === sanitizeForComparison(formData.occasion),
      ) || null
    );
  }, [formData.occasion, occasions]);

  const bookingOccasionMeta = useMemo<BookingOccasionMeta | null>(() => {
    if (!originalBooking) return null;

    const originalOccasionName =
      typeof originalBooking.occasion === "string"
        ? originalBooking.occasion
        : originalBooking.occasionName || "";

    if (
      !originalOccasionName ||
      !formData.occasion ||
      sanitizeForComparison(originalOccasionName) !== sanitizeForComparison(formData.occasion)
    ) {
      return null;
    }

    const rawMeta = originalBooking._occasionMeta || originalBooking.occasionMeta;
    if (!rawMeta || typeof rawMeta !== "object") {
      return null;
    }

    const rawFieldLabels =
      rawMeta.fieldLabels && typeof rawMeta.fieldLabels === "object" ? rawMeta.fieldLabels : {};

    const fieldLabels = Object.keys(rawFieldLabels).reduce<Record<string, string>>((acc, key) => {
      const value = (rawFieldLabels as Record<string, unknown>)[key];
      if (typeof key === "string" && typeof value === "string" && key.trim() && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {});

    const requiredFields = Array.isArray(rawMeta.requiredFields)
      ? rawMeta.requiredFields
          .map((field: string) => (typeof field === "string" ? field.trim() : ""))
          .filter((field: string) => field.length > 0)
      : [];

    if (requiredFields.length === 0 && Object.keys(fieldLabels).length === 0) {
      return null;
    }

    return {
      fieldLabels,
      requiredFields,
    };
  }, [originalBooking, formData.occasion]);

  const requiredOccasionKeys = useMemo(() => {
    const definitionKeys: string[] = Array.isArray(selectedOccasion?.requiredFields)
      ? selectedOccasion.requiredFields
      : [];

    const metaKeys: string[] = bookingOccasionMeta?.requiredFields ?? [];

    const source: string[] = definitionKeys.length > 0 ? definitionKeys : metaKeys;

    const normalizedKeys = source
      .map((field: string) => field.trim())
      .filter((field: string) => field.length > 0);

    return Array.from(new Set(normalizedKeys));
  }, [selectedOccasion, bookingOccasionMeta]);

  const fallbackOccasionKeys = useMemo(() => {
    if (requiredOccasionKeys.length > 0) {
      return [] as string[];
    }
    const source = formData.occasionData || {};
    return Object.keys(source)
      .filter(Boolean)
      .filter((key) => {
        const rawValue = source[key];
        if (rawValue === undefined || rawValue === null) return false;
        if (typeof rawValue === "string") {
          return rawValue.trim().length > 0;
        }
        return true;
      });
  }, [requiredOccasionKeys, formData.occasionData]);

  const primaryOccasionFieldKey = useMemo(() => {
    return requiredOccasionKeys[0] ?? fallbackOccasionKeys[0] ?? null;
  }, [requiredOccasionKeys, fallbackOccasionKeys]);

  const secondaryOccasionFieldKey = useMemo(() => {
    if (requiredOccasionKeys.length > 1) {
      return requiredOccasionKeys[1];
    }
    if (requiredOccasionKeys.length === 0 && fallbackOccasionKeys.length > 1) {
      return fallbackOccasionKeys[1];
    }
    return null;
  }, [requiredOccasionKeys, fallbackOccasionKeys]);

  const getOccasionFieldLabel = (fieldKey: string) => {
    if (!fieldKey) return "";
    const labelFromOccasion = selectedOccasion?.fieldLabels?.[fieldKey];
    if (typeof labelFromOccasion === "string" && labelFromOccasion.trim()) {
      return labelFromOccasion;
    }
    const labelFromMeta = bookingOccasionMeta?.fieldLabels?.[fieldKey];
    if (typeof labelFromMeta === "string" && labelFromMeta.trim()) {
      return labelFromMeta;
    }
    return toDisplayLabel(fieldKey);
  };

  const hasManualDecorationInput = useMemo(() => {
    if (typeof formData.decorationFee !== "string") return false;
    return formData.decorationFee.trim() !== "";
  }, [formData.decorationFee]);

  const penaltyChargesValue = useMemo(() => {
    return parseCurrencyValue(formData.penaltyCharges);
  }, [formData.penaltyCharges]);

  const couponDiscountValue = useMemo(() => {
    const pricing = formData.pricingData || {};
    const rawValue = (pricing as any)?.DiscountByCoupon ?? (pricing as any)?.discountByCoupon ?? 0;
    return Math.max(0, parseCurrencyValue(rawValue as any));
  }, [formData.pricingData]);

  const manualDecorationValue = useMemo(() => {
    return parseCurrencyValue(formData.decorationFee);
  }, [formData.decorationFee]);

  const baseDecorationFee = useMemo(() => {
    if (hasManualDecorationInput) {
      return manualDecorationValue;
    }
    const pd: any = formData.pricingData || null;
    const globalPricing: any = pricingData || null;
    // Prefer booking snapshot; if zero/missing, fall back to current pricing data
    const pdRaw = pd?.appliedDecorationFee ?? pd?.decorationFee ?? pd?.decorationFees ?? pd?.baseDecorationFee;
    let value = parseCurrencyValue(pdRaw as any);
    if (!(value > 0)) {
      const globalRaw =
        globalPricing?.appliedDecorationFee ??
        globalPricing?.decorationFee ??
        globalPricing?.decorationFees ??
        globalPricing?.baseDecorationFee;
      value = parseCurrencyValue(globalRaw as any);
    }
    return value > 0 ? value : 0;
  }, [hasManualDecorationInput, manualDecorationValue, formData.pricingData, pricingData]);

  const appliedDecorationFee = useMemo(() => {
    const source: any = formData.pricingData || pricingData || null;
    const raw =
      source?.appliedDecorationFee ??
      source?.decorationFee ??
      source?.decorationFees ??
      0;
    return parseCurrencyValue(raw as any);
  }, [formData.pricingData, pricingData]);

  const hasDecorationFeeData = useMemo(() => {
    if (hasManualDecorationInput) return true;
    return baseDecorationFee > 0 || appliedDecorationFee > 0;
  }, [hasManualDecorationInput, baseDecorationFee, appliedDecorationFee]);

  const shouldApplyDecorationFee = useMemo(() => {
    if (!hasDecorationFeeData) return false;
    const occRaw = String(formData.occasion || '').trim().toLowerCase();
    const noOccasion = !occRaw || ['no occasion', 'none', 'n/a', 'not applicable', 'not specified'].includes(occRaw);
    if (noOccasion) return false;
    if (selectedOccasion && selectedOccasion.includeInDecoration === false) return false;
    return decorationEnabled;
  }, [formData.occasion, selectedOccasion, decorationEnabled, hasDecorationFeeData]);

  const decorationToggleAvailable =
    !!formData.occasion && selectedOccasion?.includeInDecoration !== false && hasDecorationFeeData;

  const decorationInputVisible = useMemo(() => {
    if (!formData.occasion || selectedOccasion?.includeInDecoration === false) {
      return false;
    }
    if (hasManualDecorationInput) return true;
    if (hasDecorationFeeData) return true;
    return true; // show input whenever an occasion exists
  }, [formData.occasion, selectedOccasion, hasManualDecorationInput, hasDecorationFeeData]);

  const formExtraGuestFee = (formData as any).extraGuestFee;
  const formExtraGuestCharges = (formData as any).extraGuestCharges;
  const formExtraGuestsCount = (formData as any).extraGuestsCount;

  const computeExtraGuestPricing = (
    sourcePricing: any,
    minimumCapacity: number,
    guestCount: number,
  ): {
    fee: number;
    charges: number;
    count: number;
  } => {
    const globalPricing: any = pricingData || {};

    const feeCandidates: unknown[] = [
      sourcePricing.extraGuestFee,
      sourcePricing.extraGuestFees,
      sourcePricing.perGuestFee,
      formExtraGuestFee,
      globalPricing.extraGuestFee,
      globalPricing.extraGuestFees,
      globalPricing.perGuestFee,
    ];

    let resolvedFee = 0;
    for (const candidate of feeCandidates) {
      const parsed = parseCurrencyValue(candidate as any);
      if (parsed > 0) {
        resolvedFee = parsed;
        break;
      }
    }

    let resolvedCharges = parseCurrencyValue(
      sourcePricing.extraGuestCharges ?? sourcePricing.extraGuestCharge ?? formExtraGuestCharges ?? 0,
    );
    let resolvedCount = Number(
      sourcePricing.extraGuestsCount ?? sourcePricing.extraGuestCount ?? formExtraGuestsCount ?? 0,
    );

    return {
      fee: resolvedFee,
      charges: resolvedCharges,
      count: resolvedCount,
    };
  };

  const handleDecorationToggle = () => {
    decorationToggleManuallySetRef.current = true;
    setDecorationEnabled((prev) => !prev);
  };

  const servicesToDisplay = useMemo(() => {
    return services.filter((service) => {
      try {
        return resolveServiceLookupKey(service) !== "movies";
      } catch {
        return true;
      }
    });
  }, [services]);

  const serviceCostSummary = useMemo(() => {
    const meta = extractSelectedServiceMeta(formData);
    const breakdown: { key: string; label: string; total: number }[] = [];
    let total = 0;

    meta.forEach(({ fieldName, items }) => {
      if (!Array.isArray(items) || items.length === 0) return;
      const label = displayNameFromSelectedField(fieldName);
      let subtotal = 0;

      items.forEach((item) => {
        const quantity =
          typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
            ? item.quantity
            : 1;
        const priceValue =
          typeof item.price === "number"
            ? item.price
            : parseCurrencyValue((item as any).price ?? (item as any).amount ?? 0);

        if (priceValue > 0) {
          subtotal += priceValue * quantity;
        }
      });

      if (subtotal > 0) {
        breakdown.push({ key: fieldName, label, total: subtotal });
        total += subtotal;
      }
    });

    if (penaltyChargesValue > 0) {
      breakdown.push({ key: "penaltyCharges", label: "Penalty Charges", total: penaltyChargesValue });
      total += penaltyChargesValue;
    }

    return { total, breakdown };
  }, [formData, penaltyChargesValue]);

  const selectedMovie = useMemo(() => {
    if (!formData.selectedMovies || formData.selectedMovies.length === 0) return null;
    return formData.selectedMovies[0];
  }, [formData.selectedMovies]);

  const selectedMovieName = selectedMovie?.name || "";
  const [selectedMoviePoster, setSelectedMoviePoster] = useState("");

  useEffect(() => {
    if (!selectedMovieName) {
      setSelectedMoviePoster("");
      return;
    }

    const derivePosterFromSelection = () => {
      if (!selectedMovie) return "";
      const candidates: unknown[] = [
        (selectedMovie as any).poster,
        (selectedMovie as any).imageUrl,
        (selectedMovie as any).image,
        (selectedMovie as any).thumbnail,
      ];
      for (const candidate of candidates) {
        const cleaned = cleanMediaUrl(candidate);
        if (cleaned) {
          return cleaned;
        }
      }
      return "";
    };

    const localPoster = derivePosterFromSelection();
    if (localPoster) {
      setSelectedMoviePoster(localPoster);
      return;
    }

    setSelectedMoviePoster("");

    let isCancelled = false;
    const controller = new AbortController();

    const fetchPoster = async () => {
      try {
        const params = new URLSearchParams({
          query: selectedMovieName,
          page: "1",
          language: "en-US",
        });
        const response = await fetch(`/api/tmdb?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.results) || data.results.length === 0) {
          return;
        }
        const primary = data.results.find((result: any) => {
          const title = (result?.title || result?.name || "").trim().toLowerCase();
          return title === selectedMovieName.trim().toLowerCase();
        }) || data.results[0];

        const posterPath = cleanMediaUrl(primary?.poster_path ? `https://image.tmdb.org/t/p/w500${primary.poster_path}` : "");
        if (!posterPath || isCancelled) {
          return;
        }
        setSelectedMoviePoster(posterPath);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to fetch movie poster", err);
        }
      }
    };

    fetchPoster();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedMovie, selectedMovieName]);

  const handleMovieSelect = (movieTitle: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedMovies: [
        {
          id: movieTitle.toLowerCase().replace(/\s+/g, "_"),
          name: movieTitle,
          price: 0,
          quantity: 1,
        },
      ],
    }));
    setShowMoviesModal(false);
  };

  const handleMovieClear = () => {
    setFormData((prev) => ({
      ...prev,
      selectedMovies: [],
    }));
    setSelectedMoviePoster("");
  };

  const selectedTheaterRecord = useMemo(() => {
    if (!formData.theaterName) return null;
    return (
      theaters.find(
        (theater: any) =>
          theater.name === formData.theaterName || theater.theaterId === formData.theaterName
      ) || null
    );
  }, [formData.theaterName, theaters]);

  const theaterBasePriceValue = useMemo(() => {
    const pricingSource: any = formData.pricingData || pricingData || {};
    const candidates: unknown[] = [
      pricingSource.theaterBasePrice,
      pricingSource.baseTheaterPrice,
      pricingSource.basePrice,
      pricingSource.theaterPrice,
      pricingSource.theaterBaseAmount,
    ];

    if (selectedTheaterRecord) {
      candidates.push(extractTheaterBasePrice(selectedTheaterRecord));
      if (selectedTheaterRecord.pricing && typeof selectedTheaterRecord.pricing === "object") {
        const theaterPricing: any = selectedTheaterRecord.pricing;
        candidates.push(
          theaterPricing.basePrice,
          theaterPricing.defaultPrice,
          theaterPricing.baseAmount,
        );
      }
    }

    for (const candidate of candidates) {
      const parsed = parseCurrencyValue(candidate as any);
      if (parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }, [formData.pricingData, pricingData, selectedTheaterRecord]);

  const theaterCapacity = useMemo(() => {
    const fallback = { min: 1, max: 20 };
    if (!selectedTheaterRecord || !selectedTheaterRecord.capacity) return fallback;
    const { capacity } = selectedTheaterRecord;
    if (
      typeof capacity === "object" &&
      typeof capacity.min === "number" &&
      typeof capacity.max === "number"
    ) {
      return { min: Math.max(1, capacity.min), max: Math.max(capacity.min, capacity.max) };
    }
    return fallback;
  }, [selectedTheaterRecord]);

  const baseCapacityMin = useMemo(() => Math.max(1, theaterCapacity?.min ?? 1), [theaterCapacity]);
  const baseCapacityMax = useMemo(
    () => Math.max(baseCapacityMin, theaterCapacity?.max ?? baseCapacityMin),
    [theaterCapacity, baseCapacityMin],
  );

  const extraGuestPricing = useMemo(() => {
    const minimumCapacity = Math.max(1, theaterCapacity?.min ?? 1);
    const guestCount = Math.max(0, formData.numberOfPeople || 0);
    const sourcePricing: any = formData.pricingData || {};
    return computeExtraGuestPricing(sourcePricing, minimumCapacity, guestCount);
  }, [
    formData.pricingData,
    formData.numberOfPeople,
    theaterCapacity,
    formExtraGuestFee,
    formExtraGuestCharges,
    formExtraGuestsCount,
    pricingData,
  ]);

  const numberOfPeopleOptions = useMemo(() => {
    const { max } = theaterCapacity;
    const options: CustomOption[] = [];
    const start = 1;
    for (let i = start; i <= max; i += 1) {
      options.push({
        value: String(i),
        label: `${i} ${i === 1 ? "Guest" : "Guests"}`,
      });
    }
    return options;
  }, [theaterCapacity]);

  useEffect(() => {
    const { max } = theaterCapacity;
    if (!formData.numberOfPeople || formData.numberOfPeople < 1) {
      handleInputChange("numberOfPeople", 1);
    } else if (formData.numberOfPeople > max) {
      handleInputChange("numberOfPeople", max);
    }
  }, [theaterCapacity, formData.numberOfPeople]);

  const selectableSlots = useMemo(() => {
    // Show all slots; booked/going will be disabled (except current selection)
    return availableSlots;
  }, [availableSlots]);

  const editorDisplayName = useMemo(() => {
    if (!editorMeta.name) return "";
    if (editorMeta.role === "staff" && editorMeta.id) {
      return `${editorMeta.name} · ID: ${editorMeta.id}`;
    }
    return editorMeta.name;
  }, [editorMeta]);

  const buildFormState = (booking: any, occasionDefinitions: OccasionOption[] = occasions): BookingFormState => {
    const parsedDateValue = parseDateValue(booking.date) || parseDateValue(booking.selectedDate);
    const parsedDate = parsedDateValue
      ? formatDateDisplayValue(parsedDateValue)
      : ensureDisplayDateString(booking.date || booking.selectedDate || "");

    const normalizedOccasionData: Record<string, string> = {};
    const possibleOccasionFields = [
      "birthdayName",
      "birthdayGender",
      "partner1Name",
      "partner1Gender",
      "partner2Name",
      "partner2Gender",
      "dateNightName",
      "proposerName",
      "proposalPartnerName",
      "valentineName",
      "customCelebration",
      "babyShowerParentName",
      "babyGender",
      "farewellPersonName",
      "farewellReason",
      "congratulationsPersonName",
      "congratulationsReason",
    ];

    possibleOccasionFields.forEach((field) => {
      if (booking[field]) {
        normalizedOccasionData[field] = booking[field];
      }
    });

    if (booking.occasionData && typeof booking.occasionData === "object") {
      Object.assign(normalizedOccasionData, booking.occasionData);
    }

    const labelValuePairs: [string, string][] = [];
    const rawOccasionEntries: [string, unknown][] =
      booking.occasionData && typeof booking.occasionData === "object"
        ? Object.entries(booking.occasionData)
        : [];

    Object.keys(booking).forEach((key) => {
      if (key.endsWith("_label")) {
        const base = key.replace("_label", "");
        const value = booking[base] || booking[`${base}_value`];
        if (value) {
          const camelKey = base
            .split(" ")
            .map((word, index) =>
              index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join("");
          normalizedOccasionData[camelKey] = value;

          const labelText = booking[key];
          if (typeof labelText === "string") {
            labelValuePairs.push([sanitizeForComparison(labelText), value]);
          }
        }
      }
    });

    const occasionDefinition = (() => {
      if (!Array.isArray(occasionDefinitions) || occasionDefinitions.length === 0) {
        return null;
      }
      const direct = occasionDefinitions.find(
        (occ) => sanitizeForComparison(occ.name) === sanitizeForComparison(booking.occasion || ""),
      );
      if (direct) return direct;
      return findClosestOccasionDefinition(booking.occasion || "", occasionDefinitions);
    })();

    const metaFromBooking = (() => {
      const candidate = (booking._occasionMeta || booking.occasionMeta) as
        | { fieldLabels?: Record<string, string>; requiredFields?: string[] }
        | undefined;
      if (!candidate || typeof candidate !== "object") {
        return { fieldLabels: {}, requiredFields: [] };
      }
      return {
        fieldLabels: candidate.fieldLabels || {},
        requiredFields: Array.isArray(candidate.requiredFields) ? candidate.requiredFields : [],
      };
    })();

    const combinedFieldLabels: Record<string, string> = {
      ...(occasionDefinition?.fieldLabels || {}),
      ...metaFromBooking.fieldLabels,
    };

    if (occasionDefinition?.requiredFields) {
      occasionDefinition.requiredFields.forEach((fieldKey) => {
        if (normalizedOccasionData[fieldKey]) {
          return;
        }

        const fieldLabel = occasionDefinition.fieldLabels?.[fieldKey];
        const sanitizedFieldLabel = fieldLabel ? sanitizeForComparison(fieldLabel) : undefined;
        let matchedValue: string | undefined;

        if (sanitizedFieldLabel) {
          matchedValue = labelValuePairs.find(([label]) =>
            label === sanitizedFieldLabel || label.includes(sanitizedFieldLabel) || sanitizedFieldLabel.includes(label),
          )?.[1];
        }

        if (!matchedValue) {
          const synonyms = OCCASION_FIELD_SYNONYMS[fieldKey] || [];
          matchedValue = labelValuePairs.find(([label]) => synonyms.some((syn) => label.includes(syn)))?.[1];
        }

        if (!matchedValue) {
          const synonyms = OCCASION_FIELD_SYNONYMS[fieldKey] || [];
          const normalizedKey = Object.keys(normalizedOccasionData).find((keyName) =>
            synonyms.some((syn) => sanitizeForComparison(keyName).includes(syn)),
          );
          if (normalizedKey) {
            matchedValue = normalizedOccasionData[normalizedKey];
          }
        }

        if (matchedValue) {
          normalizedOccasionData[fieldKey] = matchedValue;
        }
      });
    }

    Object.entries(combinedFieldLabels).forEach(([camelKey, label]) => {
      if (!camelKey || normalizedOccasionData[camelKey]) {
        return;
      }
      if (typeof label !== "string" || !label.trim()) {
        return;
      }
      const sanitizedLabel = sanitizeForComparison(label);
      if (!sanitizedLabel) {
        return;
      }

      let matchedValue: string | undefined;

      for (const [rawKey, rawValue] of rawOccasionEntries) {
        if (rawValue === undefined || rawValue === null) {
          continue;
        }
        const stringValue = Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue);
        if (!stringValue.trim()) {
          continue;
        }
        const sanitizedRawKey = sanitizeForComparison(String(rawKey));
        if (!sanitizedRawKey) {
          continue;
        }

        const distance = levenshteinDistance(sanitizedRawKey, sanitizedLabel);
        const isDirectMatch =
          sanitizedRawKey === sanitizedLabel ||
          sanitizedRawKey.includes(sanitizedLabel) ||
          sanitizedLabel.includes(sanitizedRawKey);

        if (isDirectMatch || distance <= 2) {
          matchedValue = stringValue;
          break;
        }
      }

      if (!matchedValue) {
        const synonyms = OCCASION_FIELD_SYNONYMS[camelKey] || [];
        for (const synonym of synonyms) {
          for (const [rawKey, rawValue] of rawOccasionEntries) {
            if (rawValue === undefined || rawValue === null) {
              continue;
            }
            const stringValue = Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue);
            if (!stringValue.trim()) {
              continue;
            }
            const sanitizedRawKey = sanitizeForComparison(String(rawKey));
            if (!sanitizedRawKey) {
              continue;
            }
            if (sanitizedRawKey.includes(synonym) || synonym.includes(sanitizedRawKey)) {
              matchedValue = stringValue;
              break;
            }
          }
          if (matchedValue) {
            break;
          }
        }
      }

      if (matchedValue) {
        normalizedOccasionData[camelKey] = matchedValue;
      }
    });

    const resolvedOccasionName = occasionDefinition?.name || booking.occasion || "";

    const rawPricingData =
      booking.pricingData && typeof booking.pricingData === "object"
        ? { ...booking.pricingData }
        : {};

    const appliedDecorationFee = Number(
      rawPricingData.appliedDecorationFee ??
      rawPricingData.decorationFee ??
      booking.appliedDecorationFee ??
      booking.decorationFee ??
      0,
    ) || 0;

    const baseDecorationFee = Number(
      rawPricingData.decorationFees ??
      rawPricingData.decorationFee ??
      booking.decorationFee ??
      appliedDecorationFee,
    ) || 0;

    const rawAdminDiscount =
      (rawPricingData as any).specialDiscount ??
      rawPricingData.adminDiscount ??
      rawPricingData.adminDiscountAmount ??
      (booking as any).specialDiscount ??
      booking.adminDiscount ??
      booking.adminDiscountAmount ??
      0;

    const resolvedAdminDiscount = Number(rawAdminDiscount ?? 0) || 0;

    const resolvedDecorationInputValue = appliedDecorationFee || baseDecorationFee;
    const extraGuestFeeValue = parseCurrencyValue(
      (rawPricingData as any).extraGuestFee ??
        (rawPricingData as any).extraGuestFees ??
        (rawPricingData as any).perGuestFee ??
        booking.extraGuestFee ??
        booking.extraGuestFees ??
        booking.perGuestFee ??
        0,
    );
    const extraGuestChargesValue = parseCurrencyValue(
      (rawPricingData as any).extraGuestCharges ??
        (rawPricingData as any).extraGuestCharge ??
        booking.extraGuestCharges ??
        booking.extraGuestCharge ??
        0,
    );
    const rawExtraGuestsCount =
      (rawPricingData as any).extraGuestsCount ??
      (rawPricingData as any).extraGuestCount ??
      booking.extraGuestsCount ??
      booking.extraGuestCount ??
      0;
    const extraGuestsCountValue = Number.isFinite(Number(rawExtraGuestsCount))
      ? Number(rawExtraGuestsCount)
      : 0;

    const penaltyChargesValue = parseCurrencyValue(
      rawPricingData.penaltyCharges ??
        rawPricingData.penaltyCharge ??
        booking.penaltyCharges ??
        booking.penaltyCharge ??
        0,
    );

    const resolvedPenaltyReason = (() => {
      const candidates: unknown[] = [
        (rawPricingData as any)?.penaltyReason,
        booking.penaltyReason,
        (booking as any)?.penaltyReasonText,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
      return "";
    })();

    const discountByCouponValue = parseCurrencyValue(
      (rawPricingData as any)?.DiscountByCoupon ??
        (rawPricingData as any)?.discountByCoupon ??
        (booking as any)?.DiscountByCoupon ??
        (booking as any)?.discountByCoupon ??
        0,
    );

    const resolvedCouponCode =
      booking.appliedCouponCode ??
      booking.couponCode ??
      (rawPricingData as any)?.appliedCouponCode ??
      (rawPricingData as any)?.couponCode ??
      "";

    const discountGenericValue = parseCurrencyValue(
      (rawPricingData as any)?.discount ??
        (booking as any)?.discount ??
        (booking as any)?.Discount ??
        0,
    );

    const normalizedPricingData = {
      ...rawPricingData,
      decorationFees: baseDecorationFee,
      decorationFee: baseDecorationFee,
      appliedDecorationFee,
      adminDiscount: resolvedAdminDiscount,
      specialDiscount: resolvedAdminDiscount,
      discount: discountGenericValue,
      penaltyCharges: penaltyChargesValue,
      penaltyCharge: penaltyChargesValue,
      penaltyReason: resolvedPenaltyReason,
      extraGuestFee: extraGuestFeeValue,
      extraGuestCharges: extraGuestChargesValue,
      extraGuestsCount: Math.max(0, extraGuestsCountValue),
      DiscountByCoupon: discountByCouponValue,
      discountByCoupon: discountByCouponValue,
      couponDiscount: discountByCouponValue,
      appliedCouponCode: resolvedCouponCode || undefined,
      couponCode: resolvedCouponCode || undefined,
    };

    const rawTotalAmount =
      booking.totalAmount ??
      booking.amount ??
      rawPricingData.totalAmountAfterDiscount ??
      rawPricingData.grandTotal ??
      rawPricingData.totalAmount ??
      rawPricingData.finalTotal ??
      rawPricingData.total ??
      0;
    const rawAdvancePayment =
      booking.advancePayment ??
      rawPricingData.slotBookingFee ??
      rawPricingData.advancePayment ??
      booking.slotBookingFee ??
      0;
    const computedVenuePayment = calculateVenuePayment(rawTotalAmount, rawAdvancePayment);
    const rawVenuePayment =
      booking.venuePayment ??
      booking.remainingAmount ??
      rawPricingData.venuePayment ??
      rawPricingData.remainingAmount ??
      undefined;
    const resolvedVenuePayment =
      rawVenuePayment !== undefined && rawVenuePayment !== null && rawVenuePayment !== ""
        ? rawVenuePayment
        : computedVenuePayment;

    const bookingBaseCapacityMin = Math.max(
      1,
      Number(booking?.theaterCapacity?.min ?? booking?.baseCapacity ?? 0) || 1,
    );
    const bookingBaseCapacityMax = Math.max(
      bookingBaseCapacityMin,
      Number(booking?.theaterCapacity?.max ?? booking?.baseCapacity ?? bookingBaseCapacityMin) || bookingBaseCapacityMin,
    );

    const normalized = {
      bookingId: booking.bookingId || booking.id || booking._id || "",
      mongoId: booking._id ? String(booking._id) : undefined,
      customerName: booking.customerName || booking.name || "",
      email: booking.email || "",
      phone: booking.phone || booking.contactNumber || "",
      whatsappNumber: booking.whatsappNumber || booking.phone || "",
      theaterName: booking.theaterName || booking.theater || "",
      date: parsedDate || "",
      time:
        formatTimeForStorageValue(booking.time || booking.timeSlot || "") ||
        booking.time ||
        booking.timeSlot ||
        "",
      numberOfPeople: booking.numberOfPeople || booking.extraGuestsCount || 2,
      occasion: resolvedOccasionName,
      occasionData: normalizedOccasionData,
      notes: booking.notes || booking.adminNotes || "",
      adminNotes: booking.adminNotes || "",
      status: booking.status || "pending",
      paymentStatus: booking.paymentStatus || booking.payment_status || "unpaid",
      venuePaymentMethod:
        booking.venuePaymentMethod ||
        booking.paymentMethod ||
        booking.finalPaymentMethod ||
        "online",
      totalAmount: formatCurrencyInput(rawTotalAmount),
      advancePayment: formatCurrencyInput(rawAdvancePayment),
      venuePayment: formatCurrencyInput(resolvedVenuePayment),
      penaltyCharges: penaltyChargesValue ? formatCurrencyInput(penaltyChargesValue) : "",
      penaltyReason: resolvedPenaltyReason,
      extraGuestFee: extraGuestFeeValue,
      extraGuestCharges: extraGuestChargesValue,
      extraGuestsCount: Math.max(0, extraGuestsCountValue),
      decorationFee: resolvedDecorationInputValue
        ? formatCurrencyInput(resolvedDecorationInputValue)
        : "",
      adminDiscount: resolvedAdminDiscount ? formatCurrencyInput(resolvedAdminDiscount) : "",
      discount: discountGenericValue ? formatCurrencyInput(discountGenericValue) : "",
      couponCode: resolvedCouponCode || "",
      paidBy: booking.paidBy || "",
      paidAt: booking.paidAt || "",
      bookingType: booking.bookingType || (booking.isManualBooking ? "manual" : "online"),
      isManualBooking: Boolean(
        booking.isManualBooking ||
          booking.bookingType === "manual" ||
          booking.status === "manual"
      ),
      createdBy: formatCreatedByValue(booking.createdBy) || "",
      staffName:
        booking.staffName ||
        ((booking.createdBy && typeof booking.createdBy === "object")
          ? (booking.createdBy as any).staffName
          : "") ||
        "",
      staffId:
        booking.staffId ||
        booking.userId ||
        ((booking.createdBy && typeof booking.createdBy === "object")
          ? (booking.createdBy as any).staffId
          : "") ||
        "",
      selectedMovies: (booking.selectedMovies || []).map(normalizeItem),
      selectedCakes: (booking.selectedCakes || []).map(normalizeItem),
      selectedDecorItems: (booking.selectedDecorItems || []).map(normalizeItem),
      selectedGifts: (booking.selectedGifts || []).map(normalizeItem),
      selectedExtraAddOns: (booking.selectedExtraAddOns || []).map(normalizeItem),
      pricingData: normalizedPricingData,
      baseCapacityMin: bookingBaseCapacityMin,
      baseCapacityMax: bookingBaseCapacityMax,
    };

    const lookup: Record<string, ServiceItem[]> = {
      cakes: normalized.selectedCakes,
      decor: normalized.selectedDecorItems,
      gifts: normalized.selectedGifts,
      extraAddOns: normalized.selectedExtraAddOns,
      movies: normalized.selectedMovies,
    };

    try {
      Object.keys(booking || {}).forEach((key) => {
        const value = (booking as any)[key];
        if (!key.startsWith("selected") || !Array.isArray(value)) return;

        const items = value.map(normalizeItem);
        (normalized as any)[key] = items;

        if (key === "selectedCakes") lookup.cakes = items;
        else if (key === "selectedDecorItems") lookup.decor = items;
        else if (key === "selectedGifts") lookup.gifts = items;
        else if (key === "selectedMovies") lookup.movies = items;
        else if (key === "selectedExtraAddOns") lookup.extraAddOns = items;
        else {
          const suffix = String(key.slice("selected".length) || "");
          const derivedKey = suffix.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (derivedKey) {
            lookup[derivedKey] = items;
          }
        }
      });
    } catch {}

    setSelectedServiceLookup((prev) => ({
      ...prev,
      ...lookup,
    }));

    setServices(normalizeServicesForEditor(rawServices, extractSelectedServiceMeta(normalized)));

    return normalized;
  };

  const fetchTimeSlots = async (theaterName: string, date: string, theaterId?: string) => {
    if (!theaterName || !date) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("theater", theaterName);
      params.set("date", date);
       if (theaterId) {
         params.set("theaterId", theaterId);
       }
      const res = await fetch(`/api/time-slots-with-bookings?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.timeSlots)) {
        setAvailableSlots(data.timeSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const source = sessionStorage.getItem("editBookingSource");
        setIsManagementContext(source === "management");
      } catch {
        setIsManagementContext(false);
      }
    }
  }, []);

  useEffect(() => {
    const theaterId = selectedTheaterRecord?.theaterId || selectedTheaterRecord?._id;
    fetchTimeSlots(formData.theaterName, formData.date, theaterId ? String(theaterId) : undefined);
  }, [formData.theaterName, formData.date, selectedTheaterRecord]);

  useEffect(() => {
    if (!selectedTheaterRecord) return;

    const basePrice = extractTheaterBasePrice(selectedTheaterRecord);
    if (!(basePrice > 0)) return;

    setFormData((prev) => {
      const prevPricing = prev.pricingData || {};
      const prevBasePrice = parseCurrencyValue(
        ((prevPricing as any).baseTheaterPrice ??
          (prevPricing as any).theaterBasePrice ??
          (prevPricing as any).theaterPrice ??
          (prevPricing as any).theaterBaseAmount ??
          (prevPricing as any).basePrice) as any,
      );
      const prevTotal = parseCurrencyValue(prev.totalAmount);
      const extras = prevBasePrice > 0 ? Math.max(0, prevTotal - prevBasePrice) : 0;
      const nextTotal = Math.max(0, basePrice + extras);
      const prevVenue = parseCurrencyValue(prev.venuePayment);
      const nextVenue = calculateVenuePayment(nextTotal, prev.advancePayment);

      if (prevBasePrice === basePrice && prevTotal === nextTotal && prevVenue === nextVenue) {
        return prev;
      }

      return {
        ...prev,
        totalAmount: String(nextTotal),
        venuePayment: String(nextVenue),
        pricingData: {
          ...prevPricing,
          baseTheaterPrice: basePrice,
          theaterPrice: basePrice,
          theaterBaseAmount: basePrice,
          basePrice: basePrice,
        },
      };
    });
  }, [selectedTheaterRecord]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const staffUserRaw = localStorage.getItem("staffUser");
      if (staffUserRaw) {
        try {
          const staffUser = JSON.parse(staffUserRaw);
          const staffName = staffUser.name || staffUser.staffName || "Staff Member";
          const staffId = staffUser.userId || staffUser.staffId || staffUser.id || "N/A";
          setEditorMeta({ role: "staff", name: staffName, id: staffId });
          return;
        } catch {
          setEditorMeta({ role: "staff", name: "Staff Member", id: "N/A" });
          return;
        }
      }

      const adminUserRaw = localStorage.getItem("adminUser");
      if (adminUserRaw) {
        try {
          const adminUser = JSON.parse(adminUserRaw);
          const adminName = adminUser.fullName || adminUser.name || "Administrator";
          const adminId = adminUser.adminId || adminUser.id || adminUser._id;
          setEditorMeta({
            role: "admin",
            name: adminName,
            id: adminId ? String(adminId) : undefined,
          });
          return;
        } catch {
          // Fall through to token check
        }
      }

      const adminToken = localStorage.getItem("adminToken");
      if (adminToken === "authenticated") {
        setEditorMeta({ role: "admin", name: "Administrator" });
      } else {
        setEditorMeta({ role: "unknown" });
      }
    } catch {
      setEditorMeta({ role: "unknown" });
    }
  }, []);

  const loadInitialData = async () => {
    if (!queryBookingId && !queryMongoId && !queryEmail && !queryPhone) {
      setError("Missing booking identifier. Provide bookingId, mongoId, email, or phone.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        bookingRes,
        adminBookingsRes,
        manualBookingsRes,
        servicesRes,
        theatersRes,
        occasionsRes,
        pricingRes,
      ] = await Promise.all([
        queryBookingId
          ? fetch(
              `/api/booking/${encodeURIComponent(
                queryBookingId
              )}/decompress${queryEmail ? `?email=${encodeURIComponent(queryEmail)}` : ""}`,
              { cache: "no-store" }
            ).catch(() => null)
          : Promise.resolve(null),
        fetch("/api/admin/bookings").catch(() => null),
        fetch("/api/admin/manual-bookings").catch(() => null),
        fetch("/api/admin/services?includeInactive=true").catch(() => null),
        fetch("/api/admin/theaters").catch(() => null),
        fetch("/api/occasions").catch(() => null),
        fetch("/api/pricing").catch(() => null),
      ]);

      const bookingDetail = bookingRes ? await bookingRes.json().catch(() => null) : null;
      const adminBookings = adminBookingsRes ? await adminBookingsRes.json().catch(() => null) : null;
      const manualBookings = manualBookingsRes
        ? await manualBookingsRes.json().catch(() => null)
        : null;
      const servicesData = servicesRes ? await servicesRes.json().catch(() => null) : null;
      const theatersData = theatersRes ? await theatersRes.json().catch(() => null) : null;
      const occasionsData = occasionsRes ? await occasionsRes.json().catch(() => null) : null;
      const pricing = pricingRes ? await pricingRes.json().catch(() => null) : null;

      const servicesArray = Array.isArray(servicesData?.services) ? servicesData.services : [];
      setRawServices(servicesArray);
      setTheaters(Array.isArray(theatersData?.theaters) ? theatersData.theaters : []);
      const occasionList = Array.isArray(occasionsData?.occasions) ? occasionsData.occasions : [];
      setOccasions(occasionList);
      setPricingData(pricing?.pricing || null);

      const allAdmin = Array.isArray(adminBookings?.bookings) ? adminBookings.bookings : [];
      const allManual = Array.isArray(manualBookings?.manualBookings)
        ? manualBookings.manualBookings
        : manualBookings?.bookings || [];
      const combined = [...allAdmin, ...allManual];

      let targetBooking: any = null;

      if (bookingDetail?.success && bookingDetail.booking) {
        targetBooking = bookingDetail.booking;
      }

      if (!targetBooking && queryBookingId) {
        targetBooking = combined.find(
          (b) =>
            String(b.bookingId || b.id || b._id) === queryBookingId ||
            String(b._id || "") === queryMongoId
        );
      }

      if (!targetBooking && queryMongoId) {
        targetBooking = combined.find((b) => String(b._id || "") === queryMongoId);
      }

      if (!targetBooking && (queryPhone || queryEmail)) {
        targetBooking = combined.find((b) => {
          const phoneMatch =
            queryPhone &&
            normalizePhone(b.phone || b.whatsappNumber) === normalizePhone(queryPhone);
          const emailMatch =
            queryEmail && (b.email || "").toLowerCase() === queryEmail.toLowerCase();
          return phoneMatch || emailMatch;
        });
      }

      if (!targetBooking) {
        throw new Error("Booking not found. Please verify the identifier.");
      }

      setOriginalBooking(targetBooking);
      setFormData(buildFormState(targetBooking, occasionList));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load booking details. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryBookingId, queryEmail, queryPhone, queryMongoId]);

  useEffect(() => {
    if (!formData.paymentStatus) return;
    const paidStates = formData.paymentStatus === "paid" || formData.paymentStatus === "partial";

    if (paidStates) {
      if (!editorMeta.name) return;
      const nextPaidBy =
        editorMeta.role === "staff" && editorMeta.name
          ? editorMeta.name
          : editorMeta.name || "Administrator";
      const currentPaidBy = String(formData.paidBy || '').trim();
      const shouldAutofill = editorMeta.role !== 'staff' || !currentPaidBy;
      if (shouldAutofill && nextPaidBy && formData.paidBy !== nextPaidBy) {
        handleInputChange("paidBy", nextPaidBy);
      }
      return;
    }

    if (!paidStates && formData.paidBy) {
      handleInputChange("paidBy", "");
    }
  }, [formData.paymentStatus, editorMeta, formData.paidBy]);

  useEffect(() => {
    setFormData((prev) => {
      const prevAppliedValue = parseCurrencyValue(
        ((prev.pricingData as any)?.appliedDecorationFee ?? (prev.pricingData as any)?.decorationFee ?? 0) as any,
      );
      const prevStoredBase = parseCurrencyValue(
        ((prev.pricingData as any)?.decorationFees ?? (prev.pricingData as any)?.decorationFee ?? 0) as any,
      );

      const nextAppliedValue = shouldApplyDecorationFee ? baseDecorationFee : 0;
      const nextBaseValue = baseDecorationFee;

      if (prevAppliedValue === nextAppliedValue && prevStoredBase === nextBaseValue) {
        return prev;
      }

      const currentTotalValue = parseCurrencyValue(prev.totalAmount);
      const totalWithoutPrev = Math.max(0, currentTotalValue - prevAppliedValue);
      const nextTotalValue = Math.max(0, totalWithoutPrev + nextAppliedValue);
      const nextVenueValue = calculateVenuePayment(nextTotalValue, prev.advancePayment);

      const nextForm: BookingFormState = {
        ...prev,
        totalAmount: String(nextTotalValue),
        venuePayment: String(nextVenueValue),
        decorationFee: String(nextBaseValue),
      };

      const pricingPatch: Record<string, unknown> = {
        decorationFees: nextBaseValue,
        decorationFee: nextBaseValue,
        appliedDecorationFee: shouldApplyDecorationFee ? nextBaseValue : 0,
        totalAmount: nextTotalValue,
        totalAmountAfterDiscount: nextTotalValue,
        venuePayment: nextVenueValue,
      };

      nextForm.pricingData = {
        ...(prev.pricingData || {}),
        ...pricingPatch,
      };

      return nextForm;
    });
  }, [baseDecorationFee, shouldApplyDecorationFee]);

  useEffect(() => {
    const occRaw = String(formData.occasion || '').trim().toLowerCase();
    const hasOccasion = !!occRaw && !['no occasion', 'none', 'n/a', 'not applicable', 'not specified'].includes(occRaw);
    const includeDecoration = selectedOccasion?.includeInDecoration !== false;
    const appliedFee = Number((formData.pricingData as any)?.appliedDecorationFee ?? 0) || 0;

    const occasionChanged = loadedOccasionRef.current !== (formData.occasion || "");
    if (occasionChanged) {
      decorationToggleManuallySetRef.current = false;
      loadedOccasionRef.current = (formData.occasion || "") || null;
    }

    if (!hasOccasion) {
      decorationToggleManuallySetRef.current = false;
      if (decorationEnabled) {
        setDecorationEnabled(false);
      }
      return;
    }

    if (!includeDecoration) {
      if (decorationEnabled) {
        setDecorationEnabled(false);
      }
      return;
    }

    if (appliedFee > 0) {
      if (!decorationEnabled) {
        setDecorationEnabled(true);
      }
      return;
    }

    if (occasionChanged && !decorationToggleManuallySetRef.current && baseDecorationFee > 0) {
      if (!decorationEnabled) {
        setDecorationEnabled(true);
      }
      return;
    }
  }, [formData.occasion, selectedOccasion, baseDecorationFee, formData.pricingData, decorationEnabled]);

  const handleInputChange = (
    field: keyof BookingFormState,
    value: string | number | boolean | ServiceItem[] | Record<string, string> | null
  ) => {
    setFormData((prev) => {
      const next: BookingFormState = {
        ...prev,
      };
      const prevPricing = prev.pricingData || {};
      const pricingPatch: Record<string, unknown> = {};

      const normalizeInputValue = (input: unknown) => {
        if (typeof input === "number") return String(input);
        if (typeof input === "string") return input;
        if (input === null || input === undefined) return "";
        return String(input);
      };

      const extractBasePriceFromPricing = () =>
        parseCurrencyValue(
          ((prevPricing as any).baseTheaterPrice ??
            (prevPricing as any).theaterBasePrice ??
            (prevPricing as any).theaterPrice ??
            (prevPricing as any).theaterBaseAmount ??
            (prevPricing as any).basePrice) as any,
        );

      if (field === "totalAmount") {
        const rawValue = normalizeInputValue(value);
        const nextTotalValue = parseCurrencyValue(rawValue);
        const hasClearInput = rawValue.trim() === "";
        next.totalAmount = hasClearInput ? "" : String(nextTotalValue);
        const nextVenue = calculateVenuePayment(nextTotalValue, next.advancePayment);
        next.venuePayment = String(nextVenue);
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.grandTotal = nextTotalValue;
        const basePrice = extractBasePriceFromPricing();
        if (basePrice > 0) {
          pricingPatch.extraCharges = Math.max(0, nextTotalValue - basePrice);
        }
        pricingPatch.venuePayment = nextVenue;
      } else if (field === "advancePayment") {
        const rawValue = normalizeInputValue(value);
        const nextAdvanceValue = parseCurrencyValue(rawValue);
        const hasClearInput = rawValue.trim() === "";
        next.advancePayment = hasClearInput ? "" : String(nextAdvanceValue);
        const nextTotalValue = parseCurrencyValue(next.totalAmount);
        const nextVenue = Math.max(0, nextTotalValue - nextAdvanceValue);
        next.venuePayment = String(nextVenue);
        pricingPatch.advancePayment = nextAdvanceValue;
        pricingPatch.slotBookingFee = nextAdvanceValue;
        pricingPatch.advanceAmount = nextAdvanceValue;
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.venuePayment = nextVenue;
      } else if (field === "occasion") {
        const normalizedOccasion =
          typeof value === "string"
            ? value.trim()
            : value === null || value === undefined
              ? ""
              : String(value);
        const occasionChanged = normalizedOccasion !== prev.occasion;
        next.occasion = normalizedOccasion;
        if (occasionChanged) {
          if (!normalizedOccasion) {
            next.occasion = "";
            // If occasion cleared, immediately drop applied decoration from totals
            const prevAppliedDeco = parseCurrencyValue(
              ((prev.pricingData as any)?.appliedDecorationFee ?? 0) as any,
            );
            if (prevAppliedDeco > 0) {
              const prevTotalValue = parseCurrencyValue(prev.totalAmount);
              const nextTotalValue = Math.max(0, prevTotalValue - prevAppliedDeco);
              const nextVenue = calculateVenuePayment(nextTotalValue, prev.advancePayment);
              next.totalAmount = String(nextTotalValue);
              next.venuePayment = String(nextVenue);
              pricingPatch.appliedDecorationFee = 0;
              pricingPatch.totalAmount = nextTotalValue;
              pricingPatch.totalAmountAfterDiscount = nextTotalValue;
              pricingPatch.venuePayment = nextVenue;
            }
            // Clear any manual decoration input to avoid lingering overrides, keep it editable as 0
            next.decorationFee = "0";
          } else {
            // Occasion selected again: if decoration is allowed and base fee exists, re-apply immediately
            const includeDecoration = selectedOccasion?.includeInDecoration !== false;
            const prevApplied = parseCurrencyValue(
              ((prev.pricingData as any)?.appliedDecorationFee ?? 0) as any,
            );
            const prevPd: any = prev.pricingData || {};
            const globalPd: any = pricingData || {};
            const baseCandidateFromPd = parseCurrencyValue(
              ((prevPd as any).decorationFee ?? (prevPd as any).decorationFees ?? (prevPd as any).appliedDecorationFee) as any,
            );
            const baseCandidateFromGlobal = parseCurrencyValue(
              ((globalPd as any).decorationFee ?? (globalPd as any).decorationFees ?? (globalPd as any).appliedDecorationFee) as any,
            );
            const baseCandidate = baseCandidateFromPd > 0 ? baseCandidateFromPd : baseCandidateFromGlobal;
            if (includeDecoration && baseCandidate > 0) {
              const prevTotalValue = parseCurrencyValue(prev.totalAmount);
              const totalWithoutPrev = Math.max(0, prevTotalValue - prevApplied);
              const nextTotalValue = Math.max(0, totalWithoutPrev + baseCandidate);
              const nextVenue = calculateVenuePayment(nextTotalValue, prev.advancePayment);
              next.totalAmount = String(nextTotalValue);
              next.venuePayment = String(nextVenue);
              next.decorationFee = String(baseCandidate);
              pricingPatch.decorationFees = baseCandidate;
              pricingPatch.decorationFee = baseCandidate;
              pricingPatch.appliedDecorationFee = baseCandidate;
              pricingPatch.totalAmount = nextTotalValue;
              pricingPatch.totalAmountAfterDiscount = nextTotalValue;
              pricingPatch.venuePayment = nextVenue;
            }
          }
          // clear previous occasion-specific fields
          next.occasionData = {};
          decorationToggleManuallySetRef.current = false;
        }
      } else if (field === "adminDiscount") {
        const inputValue = normalizeInputValue(value);
        const prevDiscountValue = parseCurrencyValue(prev.adminDiscount);
        const nextDiscountValue = parseCurrencyValue(inputValue);
        const prevTotalValue = parseCurrencyValue(prev.totalAmount);
        const adjustedTotal = Math.max(0, prevTotalValue - (nextDiscountValue - prevDiscountValue));
        const nextVenue = calculateVenuePayment(adjustedTotal, prev.advancePayment);
        next.adminDiscount = inputValue;
        next.totalAmount = String(adjustedTotal);
        next.venuePayment = String(nextVenue);
        pricingPatch.adminDiscount = nextDiscountValue;
        pricingPatch.specialDiscount = nextDiscountValue;
        pricingPatch.discountAmount = nextDiscountValue;
        pricingPatch.totalAmount = adjustedTotal;
        pricingPatch.totalAmountAfterDiscount = adjustedTotal;
        pricingPatch.venuePayment = nextVenue;
      } else if (field === "discount") {
        const inputValue = normalizeInputValue(value);
        const prevGenericDiscount = parseCurrencyValue((prev as any).discount);
        const nextGenericDiscount = parseCurrencyValue(inputValue);
        const prevTotalValue = parseCurrencyValue(prev.totalAmount);
        const adjustedTotal = Math.max(0, prevTotalValue - (nextGenericDiscount - prevGenericDiscount));
        const nextVenue = calculateVenuePayment(adjustedTotal, prev.advancePayment);
        (next as any).discount = inputValue;
        next.totalAmount = String(adjustedTotal);
        next.venuePayment = String(nextVenue);
        (pricingPatch as any).discount = nextGenericDiscount;
        pricingPatch.totalAmount = adjustedTotal;
        pricingPatch.totalAmountAfterDiscount = adjustedTotal;
        pricingPatch.venuePayment = nextVenue;
        const basePrice = extractBasePriceFromPricing();
        if (basePrice > 0) {
          pricingPatch.extraCharges = Math.max(0, adjustedTotal - basePrice);
        }
      } else if (field === "penaltyCharges") {
        const inputValue = normalizeInputValue(value);
        const prevPenaltyValue = parseCurrencyValue(prev.penaltyCharges);
        const nextPenaltyValue = parseCurrencyValue(inputValue);
        const prevTotalValue = parseCurrencyValue(prev.totalAmount);
        const totalWithoutPrev = Math.max(0, prevTotalValue - prevPenaltyValue);
        const nextTotalValue = Math.max(0, totalWithoutPrev + nextPenaltyValue);
        const nextVenue = calculateVenuePayment(nextTotalValue, prev.advancePayment);
        next.penaltyCharges = inputValue;
        next.totalAmount = String(nextTotalValue);
        next.venuePayment = String(nextVenue);
        pricingPatch.penaltyCharges = nextPenaltyValue;
        pricingPatch.penaltyCharge = nextPenaltyValue;
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.grandTotal = nextTotalValue;
        pricingPatch.venuePayment = nextVenue;
        const basePrice = extractBasePriceFromPricing();
        if (basePrice > 0) {
          pricingPatch.extraCharges = Math.max(0, nextTotalValue - basePrice);
        }
      } else if (field === "penaltyReason") {
        const rawValue = normalizeInputValue(value);
        const trimmed = rawValue.trim();
        next.penaltyReason = rawValue;
        pricingPatch.penaltyReason = trimmed;
      } else if (field === "decorationFee") {
        const inputValue = normalizeInputValue(value);
        const prevFeeValue = parseCurrencyValue(prev.decorationFee);
        const nextFeeValue = parseCurrencyValue(inputValue);
        const prevApplied = shouldApplyDecorationFee ? prevFeeValue : 0;
        const nextApplied = shouldApplyDecorationFee ? nextFeeValue : 0;
        const prevTotalValue = parseCurrencyValue(prev.totalAmount);
        const totalWithoutPrev = Math.max(0, prevTotalValue - prevApplied);
        const nextTotalValue = Math.max(0, totalWithoutPrev + nextApplied);
        const nextVenue = calculateVenuePayment(nextTotalValue, prev.advancePayment);
        next.decorationFee = inputValue;
        next.totalAmount = String(nextTotalValue);
        next.venuePayment = String(nextVenue);
        pricingPatch.decorationFees = nextFeeValue;
        pricingPatch.decorationFee = nextFeeValue;
        pricingPatch.appliedDecorationFee = shouldApplyDecorationFee ? nextFeeValue : 0;
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.venuePayment = nextVenue;
      } else if (field === "numberOfPeople") {
        const requestedCountRaw = typeof value === "number" ? value : Number(value);
        const normalizedRequestedCount = Number.isFinite(requestedCountRaw)
          ? Math.round(requestedCountRaw)
          : prev.numberOfPeople;
        const baseCapacityMin = Math.max(1, theaterCapacity?.min ?? 1);
        const baseCapacityMax = Math.max(baseCapacityMin, theaterCapacity?.max ?? normalizedRequestedCount ?? baseCapacityMin);
        const clampedCount = Math.min(Math.max(normalizedRequestedCount, baseCapacityMin), baseCapacityMax);
        next.numberOfPeople = clampedCount;

        const prevPricingData = prev.pricingData || {};
        const prevExtraCharges = parseCurrencyValue(
          ((prevPricingData as any).extraGuestCharges ?? (prev as any).extraGuestCharges) as any,
        );
        const prevExtraGuestsCount = Number(
          (prevPricingData as any).extraGuestsCount ?? (prev as any).extraGuestsCount ?? 0,
        );

        const resolveExtraGuestFee = () => {
          const candidateValues: unknown[] = [
            (prevPricingData as any).extraGuestFee,
            (prevPricingData as any).extraGuestFees,
            (prevPricingData as any).perGuestFee,
            (prev as any).extraGuestFee,
            (pricingData as any)?.extraGuestFee,
            (pricingData as any)?.extraGuestFees,
            (pricingData as any)?.perGuestFee,
          ];
          for (const candidate of candidateValues) {
            const parsed = parseCurrencyValue(candidate as any);
            if (parsed > 0) {
              return parsed;
            }
          }
          if (prevExtraGuestsCount > 0 && prevExtraCharges > 0) {
            return prevExtraCharges / prevExtraGuestsCount;
          }
          return 0;
        };

        const resolvedFee = resolveExtraGuestFee();
        const extraGuestFee = Number.isFinite(resolvedFee) ? Math.max(0, Math.round(resolvedFee * 100) / 100) : 0;
        const extraGuestsCount = Math.max(0, clampedCount - baseCapacityMin);
        const nextExtraGuestCharges = (() => {
          if (!(extraGuestFee > 0) || extraGuestsCount <= 0) return 0;
          return Math.max(0, Math.round(extraGuestFee * extraGuestsCount * 100) / 100);
        })();

        const prevTotalValue = parseCurrencyValue(prev.totalAmount);
        const totalWithoutPrev = Math.max(0, prevTotalValue - prevExtraCharges);
        const nextTotalValue = Math.max(0, totalWithoutPrev + nextExtraGuestCharges);
        const nextVenue = calculateVenuePayment(nextTotalValue, prev.advancePayment);

        next.totalAmount = String(nextTotalValue);
        next.venuePayment = String(nextVenue);

        (next as any).extraGuestFee = extraGuestFee;
        (next as any).extraGuestCharges = nextExtraGuestCharges;
        (next as any).extraGuestsCount = extraGuestsCount;

        pricingPatch.extraGuestFee = extraGuestFee;
        pricingPatch.extraGuestCharges = nextExtraGuestCharges;
        pricingPatch.extraGuestsCount = extraGuestsCount;
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.venuePayment = nextVenue;
        pricingPatch.grandTotal = nextTotalValue;
        const basePrice = extractBasePriceFromPricing();
        if (basePrice > 0) {
          pricingPatch.extraCharges = Math.max(0, nextTotalValue - basePrice);
        }
      } else if (field === "venuePayment") {
        const rawValue = normalizeInputValue(value);
        const nextVenueValue = parseCurrencyValue(rawValue);
        const hasClearInput = rawValue.trim() === "";
        next.venuePayment = hasClearInput ? "" : String(nextVenueValue);
        const advanceValue = parseCurrencyValue(next.advancePayment ?? prev.advancePayment);
        const nextTotalValue = Math.max(0, advanceValue + nextVenueValue);
        next.totalAmount = String(nextTotalValue);
        pricingPatch.venuePayment = nextVenueValue;
        pricingPatch.totalAmount = nextTotalValue;
        pricingPatch.totalAmountAfterDiscount = nextTotalValue;
        pricingPatch.grandTotal = nextTotalValue;
      } else {
        (next as any)[field] = value;
      }

      if (Object.keys(pricingPatch).length > 0) {
        next.pricingData = {
          ...prevPricing,
          ...pricingPatch,
        };
      }

      return next;
    });
  };

  const handleOccasionFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      occasionData: {
        ...prev.occasionData,
        [key]: value,
      },
    }));
  };

  const persistServiceSelections = async (
    fieldName: ServiceFieldName,
    items: ServiceItem[],
    totalAmount?: number,
    venuePayment?: number,
  ) => {
    if (!formData.bookingId) return;
    try {
      const payload: Record<string, unknown> = {
        bookingId: formData.bookingId,
        [fieldName]: items,
      };
      if (typeof totalAmount === "number" && Number.isFinite(totalAmount)) {
        payload.totalAmount = totalAmount;
        payload.amount = totalAmount;
      }
      if (typeof venuePayment === "number" && Number.isFinite(venuePayment)) {
        payload.venuePayment = venuePayment;
      }
      const adminDiscountParsed = parseCurrencyValue(formData.adminDiscount);
      const decorationRaw = typeof formData.decorationFee === "string" ? formData.decorationFee : "";
      const decorationValue = parseCurrencyValue(decorationRaw);
      const appliedDecorationValue = shouldApplyDecorationFee ? decorationValue : 0;
      const occRaw = String(formData.occasion || '').trim().toLowerCase();
      const noOccasion = !occRaw || ['no occasion', 'none', 'n/a', 'not applicable', 'not specified'].includes(occRaw);

      const nextPricingData: Record<string, unknown> = {
        ...(formData.pricingData || {}),
      };

      let hasPricingChanges = false;

      if (adminDiscountParsed > 0) {
        payload.adminDiscount = adminDiscountParsed;
        payload.specialDiscount = adminDiscountParsed;
        nextPricingData.adminDiscount = adminDiscountParsed;
        nextPricingData.specialDiscount = adminDiscountParsed;
        hasPricingChanges = true;
      }

      if (decorationRaw.trim() !== "" || decorationValue > 0 || appliedDecorationValue > 0) {
        payload.decorationFee = decorationValue;
        payload.appliedDecorationFee = appliedDecorationValue;
        nextPricingData.decorationFees = decorationValue;
        nextPricingData.decorationFee = decorationValue;
        nextPricingData.appliedDecorationFee = appliedDecorationValue;
        hasPricingChanges = true;
      } else if (noOccasion || !shouldApplyDecorationFee) {
        // Explicitly clear decoration when no occasion or not applied
        payload.decorationFee = 0;
        payload.appliedDecorationFee = 0;
        nextPricingData.appliedDecorationFee = 0;
        hasPricingChanges = true;
      }

      const penaltyRaw = typeof formData.penaltyCharges === "string" ? formData.penaltyCharges : "";
      const penaltyValue = parseCurrencyValue(penaltyRaw);
      payload.penaltyCharges = penaltyValue;
      nextPricingData.penaltyCharges = penaltyValue;
      nextPricingData.penaltyCharge = penaltyValue;
      hasPricingChanges = true;

      const genericDiscountRaw = typeof (formData as any).discount === "string" ? (formData as any).discount : "";
      const genericDiscountParsed = parseCurrencyValue(genericDiscountRaw);
      (payload as any).Discount = genericDiscountParsed;
      (nextPricingData as any).discount = genericDiscountParsed;
      hasPricingChanges = true;

      if (hasPricingChanges) {
        payload.pricingData = nextPricingData;
      }
      if (formData.isManualBooking) payload.isManualBooking = true;

      const res = await fetch("/api/admin/update-booking", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) {
        throw new Error(data?.error || "Failed to update booking");
      }
      if (data.booking) {
        setOriginalBooking(data.booking);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update booking";
      setError(message);
    }
  };

  const toggleServiceItem = (service: any, rawItem: any) => {
    const serviceName = String(service?.name || "");
    const lookupKey = getServiceLookupKey(serviceName);
    const fieldName = getServiceFieldName(serviceName);
    const item = normalizeItem(rawItem);

    if (!item.name) return;

    setFormData((prev) => {
      const current = (prev[fieldName] || []) as ServiceItem[];
      const isFood = isFoodServiceName(serviceName);
      const variantOptions = isFood ? getFoodVariantOptions(item) : [];
      const hasVariants = variantOptions.length > 1;

      const matchesVariantBase = (selected: ServiceItem) => {
        const baseId = String(item.id || '').trim();
        const baseName = String(item.name || '').trim();
        const selectedId = String(selected.id || '').trim();
        const selectedName = String(selected.name || '').trim();
        if (baseId && (selectedId === baseId || selectedId.startsWith(`${baseId}-`))) return true;
        if (baseName && (selectedName === baseName || selectedName.startsWith(`${baseName} (`))) return true;
        return false;
      };

      const matchedVariants = hasVariants ? current.filter(matchesVariantBase) : [];
      const exists = hasVariants
        ? matchedVariants.length > 0
        : current.some(
            (selected) =>
              (selected.id && item.id && selected.id === item.id) || selected.name === item.name,
          );

      if (hasVariants && !exists) {
        setVariantTargetService(service);
        setVariantMenuItem(item);
        setVariantQty(1);
        setVariantSelectedKey(variantOptions[0].key);
        setVariantModalOpen(true);
        return prev;
      }

      const next = exists
        ? hasVariants
          ? current.filter((selected) => !matchesVariantBase(selected))
          : current.filter(
              (selected) =>
                !((selected.id && item.id && selected.id === item.id) || selected.name === item.name),
            )
        : [...current, item];

      const rawTotal = parseCurrencyValue(prev.totalAmount);
      const currentTotal = Number.isFinite(rawTotal) ? rawTotal : 0;
      const delta = (() => {
        if (exists) {
          if (hasVariants) {
            return -matchedVariants.reduce(
              (sum, selected) => sum + (Number(selected.price || 0) * Number(selected.quantity || 0)),
              0,
            );
          }
          const matchedItem = current.find(
            (selected) =>
              (selected.id && item.id && selected.id === item.id) || selected.name === item.name,
          );
          const unitPrice = Number(matchedItem?.price ?? item.price ?? 0) || 0;
          const qty = Number(matchedItem?.quantity ?? item.quantity ?? 1) || 1;
          return -unitPrice * qty;
        }
        const unitPrice = Number(item.price ?? 0) || 0;
        const qty = Number(item.quantity ?? 1) || 1;
        return unitPrice * qty;
      })();

      const nextTotal = Math.max(0, currentTotal + delta);
      const nextVenuePayment = calculateVenuePayment(nextTotal, prev.advancePayment);

      setSelectedServiceLookup((prevLookup) => ({
        ...prevLookup,
        [lookupKey]: next,
      }));

      void persistServiceSelections(fieldName, next, nextTotal, nextVenuePayment);

      return {
        ...prev,
        [fieldName]: next,
        totalAmount: String(nextTotal),
        venuePayment: String(nextVenuePayment),
      };
    });
  };

  const emitTheaterSlotRefresh = useCallback(
    (
      next: Partial<BookingFormState> | null,
      previous: Partial<BookingFormState> | null,
      bookingId?: string | null,
    ) => {
      if (typeof window === "undefined") return;

      const nextDate = (next?.date ?? previous?.date ?? "").trim();
      const nextTime = (next?.time ?? previous?.time ?? "").trim();
      const nextTheater =
        (next?.theaterName ?? (next as any)?.theater ?? previous?.theaterName ?? (previous as any)?.theater ?? "").trim();

      const detail = {
        reason: "booking_updated",
        bookingId: bookingId ?? next?.bookingId ?? previous?.bookingId ?? "",
        date: nextDate,
        time: nextTime,
        theater: nextTheater,
        originalDate: (previous?.date ?? "").trim(),
        originalTime: (previous?.time ?? "").trim(),
        originalTheater: (previous?.theaterName ?? (previous as any)?.theater ?? "").trim(),
      };

      window.dispatchEvent(new CustomEvent("refreshBookedSlots", { detail }));
      window.dispatchEvent(new CustomEvent("forceRefreshTheaterSlots", { detail }));
      window.dispatchEvent(new CustomEvent("directRefreshTheaterData", { detail }));
    },
    [],
  );

  const hasChanges = useMemo(() => {
    if (!originalBooking) return false;
    try {
      const current = JSON.stringify(formData);
      const original = JSON.stringify(buildFormState(originalBooking));
      return current !== original;
    } catch {
      return true;
    }
  }, [formData, originalBooking]);

  const handleSave = async () => {
    if (!formData.bookingId) return;
    if (isViewOnlyStaff) {
      setError("You have View-only access. Editing bookings is disabled.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const originalState = originalBooking ? buildFormState(originalBooking, occasions) : null;
      const emailChanged =
        !!originalState &&
        (originalState.email || "").trim().toLowerCase() !== (formData.email || "").trim().toLowerCase();

      const baseDecorationValFromForm = parseCurrencyValue(formData.decorationFee);
      const pdForDeco: any = formData.pricingData || {};
      const baseDecorationValFromPd = parseCurrencyValue(
        pdForDeco.decorationFee ?? pdForDeco.decorationFees ?? pdForDeco.appliedDecorationFee
      );
      const resolvedBaseDecoration = baseDecorationValFromForm > 0 ? baseDecorationValFromForm : baseDecorationValFromPd;
      const decorationFeeValue = shouldApplyDecorationFee ? resolvedBaseDecoration : 0;
      const appliedDecorationFeeValue = shouldApplyDecorationFee ? decorationFeeValue : 0;
      const advancePaymentValue = parseCurrencyValue(formData.advancePayment);
      const totalAmountValue = parseCurrencyValue(formData.totalAmount);
      const venuePaymentValue = parseCurrencyValue(formData.venuePayment);
      const adminDiscountValue = parseCurrencyValue(formData.adminDiscount);
      const genericDiscountValue = parseCurrencyValue((formData as any).discount);
      const penaltyChargesValueForSave = parseCurrencyValue(formData.penaltyCharges);
      const penaltyReasonValue = (formData.penaltyReason || "").trim();
      const discountByCouponValue = parseCurrencyValue(
        ((formData.pricingData as any)?.DiscountByCoupon ?? (formData.pricingData as any)?.discountByCoupon ?? 0) as any,
      );
      const extraGuestFeeValue = Math.max(0, extraGuestPricing.fee);
      const extraGuestChargesValue = Math.max(0, extraGuestPricing.charges);
      const extraGuestsCountValue = Math.max(0, extraGuestPricing.count);

      const pricingDataPayload: Record<string, unknown> = {
        ...(formData.pricingData || {}),
        totalAmount: totalAmountValue,
        totalAmountAfterDiscount:
          (formData.pricingData as any)?.totalAmountAfterDiscount ?? totalAmountValue,
        grandTotal: (formData.pricingData as any)?.grandTotal ?? totalAmountValue,
        venuePayment: venuePaymentValue,
        advancePayment: advancePaymentValue,
        advanceAmount: advancePaymentValue,
        slotBookingFee: advancePaymentValue,
        adminDiscount: adminDiscountValue,
        specialDiscount: adminDiscountValue,
        discount: genericDiscountValue,
        discountAmount: adminDiscountValue,
        decorationFees: decorationFeeValue,
        decorationFee: decorationFeeValue,
        appliedDecorationFee: appliedDecorationFeeValue,
        penaltyCharges: penaltyChargesValueForSave,
        penaltyCharge: penaltyChargesValueForSave,
        penaltyReason: penaltyReasonValue,
        extraGuestFee: extraGuestFeeValue,
        extraGuestCharges: extraGuestChargesValue,
        extraGuestsCount: extraGuestsCountValue,
        DiscountByCoupon: discountByCouponValue,
        discountByCoupon: discountByCouponValue,
        couponDiscount: discountByCouponValue,
        appliedCouponCode: formData.couponCode || undefined,
        couponCode: formData.couponCode || undefined,
      };

      const normalizeForLookup = (input: string) =>
        String(input || "")
          .trim()
          .toLowerCase();

      const canonicalOccasionKeys = Array.from(
        new Set(
          [...(requiredOccasionKeys || []), ...(fallbackOccasionKeys || [])]
            .map((key) => (typeof key === "string" ? key.trim() : ""))
            .filter(Boolean),
        ),
      );

      const canonicalByLower = canonicalOccasionKeys.reduce<Record<string, string>>((acc, key) => {
        acc[normalizeForLookup(key)] = key;
        return acc;
      }, {});

      const labelToCanonical = canonicalOccasionKeys.reduce<Record<string, string>>((acc, key) => {
        const label = getOccasionFieldLabel(key);
        if (label) {
          acc[normalizeForLookup(label)] = key;
        }
        return acc;
      }, {});

      const mergedOccasionMeta = new Map<string, { value: string; priority: number }>();
      const upsertOccasionValue = (mappedKey: string, value: string, priority: number) => {
        const existing = mergedOccasionMeta.get(mappedKey);
        if (!existing || priority > existing.priority || (!existing.value && value)) {
          mergedOccasionMeta.set(mappedKey, { value, priority });
        }
      };

      Object.entries(formData.occasionData || {}).forEach(([key, value]) => {
        const rawKey = typeof key === "string" ? key.trim() : "";
        if (!rawKey) return;

        const stringValue =
          typeof value === "string" ? value.trim() : value !== undefined && value !== null ? String(value) : "";
        if (!stringValue) return;

        const rawKeyLower = normalizeForLookup(rawKey);

        let mappedKey = rawKey;
        let priority = 0;

        if (canonicalByLower[rawKeyLower]) {
          mappedKey = canonicalByLower[rawKeyLower];
          priority = 2;
        } else if (labelToCanonical[rawKeyLower]) {
          mappedKey = labelToCanonical[rawKeyLower];
          priority = 1;
        }

        upsertOccasionValue(mappedKey, stringValue, priority);
      });

      const occasionDataPayload = Array.from(mergedOccasionMeta.entries()).reduce<Record<string, string>>(
        (acc, [key, meta]) => {
          acc[key] = meta.value;
          return acc;
        },
        {},
      );

      const dynamicOccasionKeys = Object.keys(occasionDataPayload);
      const originalOccasionKeys = Object.keys(originalState?.occasionData || {});
      const legacyOccasionKeysToClear = originalOccasionKeys.filter(
        (key) => !dynamicOccasionKeys.includes(key),
      );

      const payload: Record<string, unknown> = {
        bookingId: formData.bookingId,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        numberOfPeople: formData.numberOfPeople,
        venuePaymentMethod: formData.venuePaymentMethod,
        time: formData.time,
        date: ensureDisplayDateString(formData.date),
        theater: formData.theaterName,
        theaterName: formData.theaterName,
        totalAmount: totalAmountValue,
        amount: totalAmountValue,
        advancePayment: advancePaymentValue,
        slotBookingFee: advancePaymentValue,
        venuePayment: venuePaymentValue,
        adminDiscount: adminDiscountValue,
        specialDiscount: adminDiscountValue,
        Discount: genericDiscountValue,
        DiscountByCoupon: discountByCouponValue,
        decorationFee: decorationFeeValue,
        appliedDecorationFee: appliedDecorationFeeValue,
        penaltyCharges: penaltyChargesValueForSave,
        penaltyReason: penaltyReasonValue,
        extraGuestFee: extraGuestFeeValue,
        extraGuestCharges: extraGuestChargesValue,
        extraGuestsCount: extraGuestsCountValue,
        pricingData: pricingDataPayload,
        couponDiscount: discountByCouponValue,
        appliedCouponCode: formData.couponCode || undefined,
        couponCode: formData.couponCode || undefined,
        occasion: formData.occasion,
        occasionData: occasionDataPayload,
        paidBy: formData.paidBy || null,
        paidAt: formData.paidAt || null,
        name: formData.customerName,
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,
        // ...
      };

      // ...

      if (dynamicOccasionKeys.length > 0) {
        payload.dynamicOccasionKeys = dynamicOccasionKeys;
      }

      if (legacyOccasionKeysToClear.length > 0) {
        payload.legacyOccasionKeysToClear = legacyOccasionKeysToClear;
      }

      const res = await fetch("/api/admin/update-booking", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update booking");
      }

      setSaveMessage("Booking updated successfully.");
      let nextFormState: BookingFormState | null = null;
      if (data.booking) {
        const rebuilt = buildFormState(data.booking, occasions);
        setOriginalBooking(data.booking);
        setFormData(rebuilt);
        setPricingData(data.booking.pricingData || {});
        nextFormState = rebuilt;
      } else {
        const updatedTotals = {
          ...formData,
          totalAmount: String(totalAmountValue),
          advancePayment: String(advancePaymentValue),
          venuePayment: String(venuePaymentValue),
          decorationFee: formatCurrencyInput(decorationFeeValue),
          pricingData: pricingDataPayload,
        } as BookingFormState;
        setFormData(updatedTotals);
        setPricingData(pricingDataPayload);
        nextFormState = updatedTotals;
      }

      emitTheaterSlotRefresh(nextFormState, originalState, formData.bookingId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save booking changes.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderOccasionFields = () => {
    const rawKeysToRender = requiredOccasionKeys.length > 0
      ? requiredOccasionKeys
      : fallbackOccasionKeys;

    const keysToRender = Array.from(
      new Set(
        rawKeysToRender
          .map((key) => (typeof key === "string" ? key.trim() : ""))
          .filter((key) => Boolean(key)),
      ),
    );
    if (!selectedOccasion && keysToRender.length === 0) return null;
    return (
      <div className="dynamic-fields">
        {keysToRender
          .filter((key) => key !== primaryOccasionFieldKey && key !== secondaryOccasionFieldKey)
          .map((fieldKey) => {
            const value = formData.occasionData[fieldKey] || "";
            return (
              <div
                className={`form-control required ${!value.trim() ? "invalid" : ""}`}
                key={fieldKey}
              >
                <label>{getOccasionFieldLabel(fieldKey)}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleOccasionFieldChange(fieldKey, e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!value.trim()}
                  className={`${!value.trim() ? "invalid" : "valid"}`}
                />
                {!value.trim() && (
                  <small className="validation-hint">Required</small>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="edit-booking-page">
      <div className="page-header">
        <button type="button" className="ghost-btn" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="header-titles">
          <h1>Edit Booking</h1>
          <div className="meta-row">
            <p className="muted">
              {formData.bookingId ? `Booking ID: ${formData.bookingId}` : "Loading booking..."}
            </p>
            <div className="editor-chip">
              <span className={`badge ${editorMeta.role}`}>
                {editorMeta.role === "staff" ? "Staff Edit" : "Admin Edit"}
              </span>
              {editorMeta.role === "staff" && (
                <span className="editor-details">
                  {editorMeta.name && <strong>{editorMeta.name}</strong>}{" "}
                  {editorMeta.id && <span>· ID: {editorMeta.id}</span>}
                </span>
              )}
              {editorMeta.role === "admin" && editorMeta.name && (
                <span className="editor-details">
                  <strong>{editorMeta.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={loadInitialData}
            disabled={loading}
            title="Reload booking data"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSave}
            disabled={saving || !formData.bookingId || isViewOnlyStaff}
            title={isViewOnlyStaff ? "View-only access: saving disabled" : undefined}
          >
            {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <Loader2 className="spin" size={24} />
          Loading booking details...
        </div>
      )}

      {selectedFoodModalOpen && (
        <div className="service-modal__backdrop" onClick={closeSelectedFoodModal} style={{ zIndex: 1150 }}>
          <div
            className="service-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Selected food"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="service-modal__header">
              <div>
                <p className="service-modal__eyebrow">Food</p>
                <h4>Selected Food</h4>
                <p className="service-modal__description">Items added to this booking</p>
              </div>
              <button type="button" className="ghost-btn" onClick={closeSelectedFoodModal}>
                Close
              </button>
            </div>

            {(() => {
              const service = selectedFoodTargetService || activeService;
              const serviceName = String(service?.name || '');
              const fieldName = getServiceFieldName(serviceName);
              const items = ((formData as any)[fieldName] || []) as ServiceItem[];
              const sorted = [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
              if (!sorted.length) {
                return <div className="service-modal__empty">No food items added.</div>;
              }

              return (
                <div className="service-modal__list" style={{ maxHeight: 420 }}>
                  {sorted.map((it) => {
                    const qty = Number(it.quantity ?? 1) || 1;
                    const price = Number(it.price ?? 0) || 0;
                    const lineTotal = qty * price;
                    return (
                      <div key={String(it.id || it.name)} className="service-modal__item" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <p className="service-modal__item-name">{it.name}</p>
                          <p className="service-modal__item-meta">
                            Qty: {qty} · {formatINRCurrency(price)} · Total: {formatINRCurrency(lineTotal)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="service-modal__action remove"
                          onClick={() => {
                            const targetService = selectedFoodTargetService || activeService;
                            removeSelectedItemFromService(targetService, it);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {customFoodModalOpen && (
        <div className="service-modal__backdrop" onClick={closeCustomFoodModal} style={{ zIndex: 1200 }}>
          <div
            className="service-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Other food item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="service-modal__header">
              <div>
                <p className="service-modal__eyebrow">Food</p>
                <h4>Other Item</h4>
                <p className="service-modal__description">Add a custom food item not in menu</p>
              </div>
              <button type="button" className="ghost-btn" onClick={closeCustomFoodModal}>
                Close
              </button>
            </div>

            <div className="service-modal__food-controls" style={{ flexDirection: 'column', gap: 14, alignItems: 'stretch' }}>
              <label className="service-modal__food-filter" style={{ maxWidth: '100%' }}>
                <span>Food Name</span>
                <input
                  type="text"
                  value={customFoodName}
                  onChange={(e) => setCustomFoodName(e.target.value)}
                  placeholder="Enter item name"
                />
              </label>

              <div className="service-modal__list" style={{ maxHeight: 220 }}>
                {(
                  [
                    { key: 'single' as const, label: 'Single' },
                    { key: 'half' as const, label: 'Half' },
                    { key: 'full' as const, label: 'Full' },
                    { key: 'small' as const, label: 'Small' },
                    { key: 'medium' as const, label: 'Medium' },
                    { key: 'large' as const, label: 'Full' },
                  ]
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className={`service-modal__item ${customFoodSizeKey === opt.key ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCustomFoodSizeKey(opt.key)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="radio"
                        name="custom-food-size"
                        id={`custom-food-size-${opt.key}`}
                        value={opt.key}
                        checked={customFoodSizeKey === opt.key}
                        onChange={() => setCustomFoodSizeKey(opt.key)}
                      />
                      <p className="service-modal__item-name" style={{ margin: 0 }}>
                        {opt.label}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label className="service-modal__food-filter" style={{ maxWidth: 200 }}>
                  <span>Price (per item)</span>
                  <input
                    type="number"
                    min={0}
                    value={customFoodPrice}
                    onChange={(e) => setCustomFoodPrice(e.target.value)}
                    placeholder="Enter price"
                  />
                </label>

                <label className="service-modal__food-filter" style={{ maxWidth: 180 }}>
                  <span>Quantity</span>
                  <input
                    type="number"
                    min={1}
                    value={customFoodQty}
                    onChange={(e) => {
                      const v = Number(e.target.value || '1');
                      setCustomFoodQty(v > 0 ? v : 1);
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="ghost-btn" onClick={closeCustomFoodModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={addCustomFoodToService}
                  disabled={!String(customFoodName || '').trim() || !(Number(customFoodPrice) > 0)}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {variantModalOpen && variantMenuItem && (
        <div className="service-modal__backdrop" onClick={closeVariantSelectionModal} style={{ zIndex: 1100 }}>
          <div
            className="service-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose size"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="service-modal__header">
              <div>
                <p className="service-modal__eyebrow">Food Size</p>
                <h4>Choose Size</h4>
                <p className="service-modal__description">{variantMenuItem.name}</p>
              </div>
              <button type="button" className="ghost-btn" onClick={closeVariantSelectionModal}>
                Close
              </button>
            </div>

            <div className="service-modal__list">
              {getFoodVariantOptions(variantMenuItem).map((opt) => (
                <label
                  key={opt.key}
                  className={`service-modal__item ${variantSelectedKey === opt.key ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setVariantSelectedKey(opt.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="variant-size"
                      id={`variant-size-${opt.key}`}
                      value={opt.key}
                      checked={variantSelectedKey === opt.key}
                      onChange={() => setVariantSelectedKey(opt.key)}
                    />
                    <p className="service-modal__item-name" style={{ margin: 0 }}>
                      {opt.label}
                    </p>
                  </div>
                  <div className="service-modal__meta">
                    <span className="service-modal__price">{formatINRCurrency(opt.price)}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="service-modal__food-controls" style={{ justifyContent: 'space-between' }}>
              <label className="service-modal__food-filter" style={{ maxWidth: 180 }}>
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={variantQty}
                  onChange={(e) => {
                    const v = Number(e.target.value || '1');
                    setVariantQty(v > 0 ? v : 1);
                  }}
                />
              </label>
              <button
                type="button"
                className="primary-btn"
                onClick={addSelectedVariantToService}
                disabled={!variantSelectedKey}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="alert error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!loading && saveMessage && (
        <div className="alert success">
          <CheckCircle2 size={18} />
          <span>{saveMessage}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="edit-layout">
          <div className="edit-main">
            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>Booking Status</h3>
                  <p className="section-subtitle">Control the lifecycle and payment tracking.</p>
                </div>
                {hasChanges && <span className="pill">Unsaved changes</span>}
              </div>
              <div className="grid two">
                <div className="form-control">
                  <label>Status</label>
                  <StyledDropdown
                    value={formData.status}
                    options={statusOptions.map((option) => ({
                      value: option,
                      label: option.charAt(0).toUpperCase() + option.slice(1),
                    }))}
                    onChange={(val) => handleInputChange("status", val)}
                    disabled
                  />
                  {formData.date && formData.theaterName && (
                    <div className="capacity-hint">
                      {slotsLoading
                        ? "Checking slot availability..."
                        : availableSlots.length === 0
                        ? "No slots available for the selected theater/date."
                        : "Booked slots are disabled to avoid conflicts."}
                    </div>
                  )}
                </div>
                <div className="form-control">
                  <label>Payment Status</label>
                  <StyledDropdown
                    value={formData.paymentStatus}
                    options={paymentStatusOptions.map((option) => ({
                      value: option,
                      label: option.charAt(0).toUpperCase() + option.slice(1),
                    }))}
                    onChange={(val) => handleInputChange("paymentStatus", val)}
                    disabled={editorMeta.role !== 'admin'}
                  />
                </div>
                <div className="form-control">
                  <label>Payment Method</label>
                  <StyledDropdown
                    value={formData.venuePaymentMethod}
                    options={paymentMethodOptions.map((option) => ({
                      value: option,
                      label: option.toUpperCase(),
                    }))}
                    onChange={(val) => handleInputChange("venuePaymentMethod", val)}
                    disabled={editorMeta.role !== 'admin'}
                  />
                </div>
                <div className="form-control">
                  <label>Paid By</label>
                  <input
                    type="text"
                    value={formData.paidBy}
                    onChange={editorMeta.role === 'admin' ? (e) => handleInputChange("paidBy", e.target.value) : undefined}
                    placeholder="Administrator / Staff name"
                    readOnly={editorMeta.role !== 'admin'}
                    title={editorMeta.role !== 'admin' ? 'Only admins can change Paid By' : undefined}
                  />
                </div>
              </div>
            </section>

            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>
                    <Users size={16} /> Customer & Guests
                  </h3>
                  <p className="section-subtitle">Primary contact + guest counts.</p>
                </div>
              </div>
              <div className="grid two">
                <div className="form-control">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label>Email</label>
                  <div className="input-with-icon">
                    <Mail size={14} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label>Phone</label>
                  <div className="input-with-icon">
                    <Phone size={14} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label>Number of People</label>
                  <StyledDropdown
                    value={String(formData.numberOfPeople)}
                    options={numberOfPeopleOptions}
                    onChange={(val) => handleInputChange("numberOfPeople", Number(val))}
                    placeholder="Select guests"
                    disabled={!numberOfPeopleOptions.length}
                  />
                  <div className="capacity-hint">
                    Capacity: {baseCapacityMin} – {baseCapacityMax} guests included · ₹{formatINRCurrency(extraGuestPricing.fee)} per extra guest
                  </div>
                </div>
              </div>
            </section>

            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>
                    <Calendar size={16} /> Schedule & Theater
                  </h3>
                  <p className="section-subtitle">Venue, slot, and timing.</p>
                </div>
              </div>
              <div className="grid two">
                <div className="form-control">
                  <label>
                    <MapPin size={14} /> Theater
                  </label>
                  <StyledDropdown
                    value={formData.theaterName}
                    options={[
                      { value: "", label: "Select theater" },
                      ...theaters.map((theater: any) => ({
                        value: theater.name,
                        label: theater.name,
                      })),
                      ...(formData.theaterName &&
                      !theaters.find((t: any) => t.name === formData.theaterName)
                        ? [{ value: formData.theaterName, label: formData.theaterName }]
                        : []),
                    ]}
                    onChange={(val) => handleInputChange("theaterName", val)}
                  />
                </div>
                <div className="form-control">
                  <label>Date</label>
                  <button
                    type="button"
                    className={`date-picker-trigger ${formData.date ? "" : "empty"}`}
                    onClick={() => setIsDatePickerOpen(true)}
                  >
                    <span className="date-picker-trigger__value">
                      {formData.date || "Select date"}
                    </span>
                    <span className="date-picker-trigger__icon" aria-hidden>
                      <Calendar size={14} />
                    </span>
                  </button>
                </div>
                <div className="form-control">
                  <label>
                    <Clock size={14} /> Time Slot
                  </label>
                  <StyledDropdown
                    value={formData.time}
                    options={[
                      {
                        value: "",
                        label: slotsLoading ? "Loading slots..." : "Select a slot",
                        disabled: true,
                      },
                      ...selectableSlots.map((slot) => {
                        const baseLabel = slot.timeRange || `${slot.startTime} - ${slot.endTime}`;
                        const slotValue = slot.timeRange || slot.startTime;
                        const isBooked = slot.bookingStatus === "booked";
                        const isGoing = slot.bookingStatus === "going";
                        const isCurrent = slotValue === formData.time;

                        // Label rules:
                        // - Current booking's slot: show time only (green via .selected)
                        // - Other booked slots: show 'Slot Booked' only (no time)
                        // - Going slots: show 'Time Gone' only
                        let label = baseLabel;
                        if (!isCurrent && isBooked) {
                          label = `Slot Booked`;
                        } else if (!isCurrent && isGoing) {
                          label = `Time Gone`;
                        }
                        return {
                          value: slotValue,
                          label,
                          // Allow currently selected slot even if marked booked; others are disabled
                          disabled: (isBooked || isGoing) && !isCurrent,
                        };
                      }),
                      ...(formData.time &&
                      !selectableSlots.find(
                        (slot) => slot.timeRange === formData.time || slot.startTime === formData.time
                      )
                        ? [{ value: formData.time, label: formData.time }]
                        : []),
                    ]}
                    onChange={(val) => handleInputChange("time", val)}
                  />
                  {formData.date && formData.theaterName && (
                    <div className="capacity-hint">
                      {slotsLoading
                        ? "Checking slot availability..."
                        : availableSlots.length === 0
                        ? "No slots available for the selected theater/date."
                        : "Booked slots are disabled to avoid conflicts."}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>
                    <Info size={16} /> Occasion & Personalization
                  </h3>
                  <p className="section-subtitle">Occasion-specific data just like the booking popup.</p>
                </div>
              </div>
              <div className="grid two">
                <div className="form-control">
                  <label>Occasion</label>
                  <StyledDropdown
                    value={formData.occasion}
                    options={[
                      { value: "", label: "Select occasion" },
                      ...occasions
                        .filter((occ) => occ.isActive !== false)
                        .map((occ) => ({
                          value: occ.name,
                          label: occ.name,
                        })),
                      ...(formData.occasion &&
                      !occasions.find((occ) => occ.name === formData.occasion)
                        ? [{ value: formData.occasion, label: formData.occasion }]
                        : []),
                    ]}
                    onChange={(val) => handleInputChange("occasion", val)}
                  />
                </div>
                <div
                  className={`form-control ${primaryOccasionFieldKey ? "required" : ""} ${
                    primaryOccasionFieldKey && !(formData.occasionData[primaryOccasionFieldKey] || "").trim()
                      ? "invalid"
                      : ""
                  }`}
                >
                  {primaryOccasionFieldKey ? (
                    <>
                      <label>
                        {getOccasionFieldLabel(primaryOccasionFieldKey)}
                      </label>
                      <input
                        type="text"
                        value={formData.occasionData[primaryOccasionFieldKey] || ""}
                        onChange={(e) => handleOccasionFieldChange(primaryOccasionFieldKey, e.target.value)}
                        required
                        aria-required="true"
                        aria-invalid={!(formData.occasionData[primaryOccasionFieldKey] || "").trim()}
                        className={`${!(formData.occasionData[primaryOccasionFieldKey] || "").trim() ? "invalid" : "valid"}`}
                      />
                      {!(formData.occasionData[primaryOccasionFieldKey] || "").trim() && (
                        <small className="validation-hint">Required</small>
                      )}
                    </>
                  ) : (
                    <div className="form-control disabled-field">
                      <label>Occasion Detail</label>
                      <input type="text" value={"Select an occasion to load fields"} disabled />
                    </div>
                  )}
                </div>
                {secondaryOccasionFieldKey && (
                  <div
                    className={`form-control required ${
                      !(formData.occasionData[secondaryOccasionFieldKey] || "").trim() ? "invalid" : ""
                    }`}
                  >
                    <label>{getOccasionFieldLabel(secondaryOccasionFieldKey)}</label>
                    <input
                      type="text"
                      value={formData.occasionData[secondaryOccasionFieldKey] || ""}
                      onChange={(e) => handleOccasionFieldChange(secondaryOccasionFieldKey, e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!(formData.occasionData[secondaryOccasionFieldKey] || "").trim()}
                      className={`${!(formData.occasionData[secondaryOccasionFieldKey] || "").trim() ? "invalid" : "valid"}`}
                    />
                    {!(formData.occasionData[secondaryOccasionFieldKey] || "").trim() && (
                      <small className="validation-hint">Required</small>
                    )}
                  </div>
                )}
              </div>
              {renderOccasionFields()}
              {decorationToggleAvailable && (
                <div className="decor-toggle">
                  <div>
                    <p className="decor-toggle__label">Decoration Fee</p>
                    <p className="decor-toggle__desc">
                      {decorationEnabled
                        ? "Applied to payment breakdown for this booking."
                        : "Toggle on to include decoration pricing."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`decor-toggle__switch ${decorationEnabled ? "on" : "off"}`}
                    aria-pressed={decorationEnabled}
                    onClick={() => setDecorationEnabled((prev) => !prev)}
                  >
                    <span className="decor-toggle__thumb" />
                  </button>
                </div>
              )}
              {penaltyChargesValue > 0 && (
                <div className="fee-breakdown active">
                  <div className="fee-row">
                    <div>
                      <p className="fee-label">Penalty Charges</p>
                      <p className="fee-desc">Added to the total amount for this booking.</p>
                    </div>
                    <span className="fee-value">{formatINRCurrency(penaltyChargesValue)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>
                    <ClipboardList size={16} /> Services & Add-ons
                  </h3>
                  <p className="section-subtitle">
                    Mirrors the booking popup selections. Add/remove cakes, décor, gifts, movies.
                  </p>
                </div>
              </div>
              <div className="service-library simple">
                {servicesToDisplay
                  .filter((service) => service?.__shouldDisplay !== false)
                  .map((service) => {
                    const serviceKey = resolveServiceLookupKey(service);
                    const selectedItems = selectedServiceLookup[serviceKey] || [];
                    const hasSelection = selectedItems.length > 0;
                    return (
                      <div key={service._id || service.serviceId || service.name} className="service-chip-block">
                        <button
                          type="button"
                          className={`service-chip ${hasSelection ? "with-selection" : ""}`}
                          onClick={() => {
                            setFoodCategoryFilter('ALL');
                            setActiveService(service);
                          }}
                        >
                          <span className="service-chip__label">{service.name}</span>
                          {hasSelection && (
                            <span className="service-chip__badge">{selectedItems.length}</span>
                          )}
                        </button>
                        {hasSelection && (
                          <div className="service-chip__selected-list">
                            <div className="service-chip__summary">
                              <div className="service-chip__summary-title">{service.name}</div>
                              <div className="service-chip__summary-count">
                                {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
                              </div>
                              <ul className="service-chip__summary-list">
                                {selectedItems.map((item, idx) => (
                                  <li key={item.id || `${serviceKey}-summary-${idx}`}>{item.name || "Item"}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="service-chip__selected-grid">
                              {selectedItems.map((item, idx) => {
                                const label = item.name || "Item";
                                const thumb = resolveSelectedItemImage(service, item);
                                return (
                                  <div className="selected-item" key={item.id || `${serviceKey}-${idx}`}>
                                    <div className="selected-item__thumb">
                                      {thumb ? (
                                        <img src={thumb} alt={label} />
                                      ) : (
                                        <div className="selected-item__placeholder">🎁</div>
                                      )}
                                    </div>
                                    <div className="selected-item__name">{label}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                <button
                  type="button"
                  className={`service-chip movie-chip ${selectedMovieName ? "with-selection" : ""}`}
                  onClick={() => setShowMoviesModal(true)}
                >
                  <span className="movie-chip__background" aria-hidden>
                    {selectedMoviePoster ? (
                      <img src={selectedMoviePoster} alt="" />
                    ) : (
                      <span className="movie-chip__placeholder">🎬</span>
                    )}
                    <span className="movie-chip__gradient" />
                  </span>
                  <span className="movie-chip__content">
                    <span className="movie-chip__label">{selectedMovieName || "Select Movies"}</span>
                  </span>
                  {selectedMovie && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="movie-chip__remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMovieClear();
                      }}
                      aria-label="Remove selected movie"
                    >
                      <X size={14} />
                    </span>
                  )}
                </button>
                {servicesToDisplay.length === 0 && (
                  <div className="service-empty">
                    Services catalog not available. Refresh or add services from admin panel.
                  </div>
                )}
              </div>
              {serviceCostSummary.total > 0 && (
                <div className="service-total-bar">
                  <div className="service-total-bar__info">
                    <p className="service-total-bar__title">Service Total</p>
                    {serviceCostSummary.breakdown.length > 0 && (
                      <div className="service-total-bar__breakdown">
                        {serviceCostSummary.breakdown.map(({ key, label, total }) => (
                          <span key={key} className="service-total-chip">
                            <span className="service-total-chip__label">{label}</span>
                            <span className="service-total-chip__amount">
                              {formatINRCurrency(total)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="service-total-bar__amount">
                    {formatINRCurrency(serviceCostSummary.total)}
                  </span>
                </div>
              )}
            </section>

            <section className="edit-card">
              <div className="section-header">
                <div>
                  <h3>
                    <Info size={16} /> Payment Breakdown
                  </h3>
                  <p className="section-subtitle">
                    Totals, advances, and venue amounts.
                  </p>
                  <h3>Payment Breakdown</h3>
                  <p className="section-subtitle">Totals, advances, and venue amounts.</p>
                </div>
              </div>
              <div className="grid three">
                <div className="form-control">
                  <label>Total Amount</label>
                  <input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange("totalAmount", e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label>Advance Payment</label>
                  <input
                    type="number"
                    value={formData.advancePayment}
                    onChange={(e) => handleInputChange("advancePayment", e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label>Venue Payment</label>
                  <input
                    type="number"
                    value={formData.venuePayment}
                    onChange={(e) => handleInputChange("venuePayment", e.target.value)}
                  />
                </div>
                {shouldApplyDecorationFee && (
                  <div className="form-control">
                    <label>Decoration Fee</label>
                    <input
                      type="number"
                      value={formData.decorationFee}
                      onChange={(e) => handleInputChange("decorationFee", e.target.value)}
                      placeholder="Enter decoration fee"
                      min={0}
                    />
                  </div>
                )}
                <div className="form-control">
                  <label>Penalty Charges</label>
                  <input
                    type="number"
                    value={formData.penaltyCharges}
                    onChange={(e) => handleInputChange("penaltyCharges", e.target.value)}
                    placeholder="Enter penalty charges"
                    min={0}
                  />
                </div>
                <div className="form-control" style={{ gridColumn: "1 / -1" }}>
                  <label>Penalty Reason</label>
                  <textarea
                    value={formData.penaltyReason}
                    onChange={(e) => handleInputChange("penaltyReason", e.target.value)}
                    placeholder="Describe the reason for applying penalty charges"
                    rows={3}
                  />
                </div>
                <div className="form-control">
                  <label>Discount</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleInputChange("discount", e.target.value)}
                    placeholder="Enter discount"
                    min={0}
                  />
                </div>
                {editorMeta.role === "admin" && !isManagementContext && (
                  <div className="form-control">
                    <label>Admin Discount</label>
                    <input
                      type="number"
                      value={formData.adminDiscount}
                      onChange={(e) => handleInputChange("adminDiscount", e.target.value)}
                      placeholder="Enter discount amount"
                      min={0}
                    />
                  </div>
                )}
              </div>
              {couponDiscountValue > 0 && (
                <div className="fee-breakdown coupon active" role="status">
                  <div className="fee-row">
                    <div>
                      <p className="fee-label">
                        Coupon Discount
                        {formData.couponCode && (
                          <span className="coupon-chip inline">{formData.couponCode}</span>
                        )}
                      </p>
                      <p className="fee-desc">Applied automatically from the booking coupon.</p>
                    </div>
                    <span className="fee-value">-{formatINRCurrency(couponDiscountValue)}</span>
                  </div>
                </div>
              )}
              
              {(hasDecorationFeeData || decorationInputVisible) && (shouldApplyDecorationFee || baseDecorationFee > 0) && (
                <div className={`fee-breakdown ${shouldApplyDecorationFee ? "active" : ""}`}>
                  <div className="fee-row">
                    <div>
                      <p className="fee-label">Decoration Fee</p>
                      <p className="fee-desc">
                        {shouldApplyDecorationFee
                          ? "Included in totals. Adjust the amount above to change the applied price."
                          : "Toggle on to include the decoration amount in totals."}
                      </p>
                    </div>
                    <span className="fee-value">
                      {formatINRCurrency(shouldApplyDecorationFee ? baseDecorationFee : 0)}
                    </span>
                  </div>
                </div>
              )}
              {extraGuestPricing.count > 0 && extraGuestPricing.fee > 0 && (
                <div className="fee-breakdown active">
                  <div className="fee-row">
                    <div>
                      <p className="fee-label">Extra Guests</p>
                      <div className="fee-desc">
                        <span className="fee-desc__line">
                          Price of Guests:
                        </span>
                        <span className="fee-desc__line">
                          {extraGuestPricing.count} {extraGuestPricing.count === 1 ? "guest" : "guests"} × {formatINRCurrency(extraGuestPricing.fee)} = {formatINRCurrency(extraGuestPricing.charges)}
                        </span>
                      </div>
                    </div>
                    <span className="fee-value">
                      {formatINRCurrency(extraGuestPricing.charges)}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="edit-side">
            <div className="edit-card">
              <div className="section-header">
                <h3>Booking Metadata</h3>
              </div>
              <div className="stack">
                <div className="form-control">
                  <label>Booking Type</label>
                  <StyledDropdown
                    value={formData.bookingType}
                    options={bookingTypeOptions.map((option) => ({
                      value: option,
                      label: toDisplayLabel(option),
                    }))}
                    onChange={(val) => handleInputChange("bookingType", val)}
                    disabled
                  />
                </div>
                <div className="form-control checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isManualBooking}
                      onChange={(e) => handleInputChange("isManualBooking", e.target.checked)}
                      disabled
                    />
                    Manual booking
                  </label>
                </div>
                <div className="form-control">
                  <label>Created By</label>
                  <input
                    type="text"
                    value={formData.createdBy}
                    onChange={(e) => handleInputChange("createdBy", e.target.value)}
                    readOnly
                  />
                </div>
                <div className="form-control">
                  <label>Staff Name</label>
                  <input
                    type="text"
                    value={formData.staffName}
                    onChange={(e) => handleInputChange("staffName", e.target.value)}
                    readOnly
                  />
                </div>
                <div className="form-control">
                  <label>Staff ID</label>
                  <input
                    type="text"
                    value={formData.staffId}
                    onChange={(e) => handleInputChange("staffId", e.target.value)}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="edit-card">
              <div className="section-header">
                <h3>Internal Notes</h3>
              </div>
              <textarea
                rows={4}
                value={formData.adminNotes}
                onChange={(e) => handleInputChange("adminNotes", e.target.value)}
              />
            </div>

            <div className="edit-card info-card">
              <h4>Need the popup flow?</h4>
              <p>
                This dedicated page mirrors the booking popup but keeps everything accessible,
                searchable, and auditable for admins and management.
              </p>
              <ul>
                <li>All data loads straight from MongoDB.</li>
                <li>Manual & confirmed bookings share the same editor.</li>
                <li>No sessionStorage tricks or popups required.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {activeService && (
        <div className="service-modal__backdrop" onClick={() => setActiveService(null)}>
          <div
            className="service-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeService.name} catalog`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="service-modal__header">
              <div>
                <p className="service-modal__eyebrow">Service Catalog</p>
                <h4>{activeService.name}</h4>
                {activeService.description && (
                  <p className="service-modal__description">{activeService.description}</p>
                )}
              </div>
              <button type="button" className="ghost-btn" onClick={() => setActiveService(null)}>
                Close
              </button>
            </div>

            {isFoodServiceName(activeService?.name) && (
              <div className="service-modal__food-controls">
                <label className="service-modal__food-filter">
                  <span>Category</span>
                  <select
                    value={foodCategoryFilter}
                    onChange={(e) => setFoodCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All</option>
                    {Array.from(
                      new Set<string>(
                        (Array.isArray(activeService.items) ? activeService.items : [])
                          .map((it: any) => String(it?.categoryName || '').trim())
                          .filter((v: string) => Boolean(v)),
                      ),
                    )
                      .sort((a, b) => a.localeCompare(b))
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ height: 40, alignSelf: 'flex-end' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    openSelectedFoodModal(activeService);
                  }}
                >
                  Selected Food
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ height: 40, alignSelf: 'flex-end' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    openCustomFoodModal(activeService);
                  }}
                >
                  Other
                </button>
              </div>
            )}

            <div className={isFoodServiceName(activeService?.name) ? 'service-modal__food-grid' : 'service-modal__list'}>
              {Array.isArray(activeService.items) && activeService.items.length > 0 ? (
                activeService.items
                  .filter((item: any) => {
                    if (!isFoodServiceName(activeService?.name)) return true;
                    if (foodCategoryFilter === 'ALL') return true;
                    return String(item?.categoryName || '').trim() === foodCategoryFilter;
                  })
                  .map((item: any, index: number) => {
                    const serviceKey = resolveServiceLookupKey(activeService);
                    const selectedItems = selectedServiceLookup[serviceKey] || [];
                    const baseId = String(item.id || item._id || '').trim();
                    const baseName = String(item.name || item.title || '').trim();
                    const isSelected = selectedItems.some((selected) => {
                      const selectedId = String(selected.id || '').trim();
                      const selectedName = String(selected.name || '').trim();
                      if (baseId && (selectedId === baseId || selectedId.startsWith(`${baseId}-`))) return true;
                      if (baseName && (selectedName === baseName || selectedName.startsWith(`${baseName} (`))) return true;
                      return false;
                    });

                    const priceLabel = (() => {
                      const mode = item.pricingMode;
                      if (mode === 'half-full') {
                        const half = extractNumericValue(item.halfPrice);
                        const full = extractNumericValue(item.fullPrice);
                        const parts: string[] = [];
                        if (half !== undefined && half !== null) parts.push(`Half: ${formatINRCurrency(half)}`);
                        if (full !== undefined && full !== null) parts.push(`Full: ${formatINRCurrency(full)}`);
                        return parts.length ? parts.join(' · ') : null;
                      }
                      if (mode === 'three-size') {
                        const s = extractNumericValue(item.smallPrice);
                        const m = extractNumericValue(item.mediumPrice);
                        const l = extractNumericValue(item.largePrice);
                        const parts: string[] = [];
                        if (s !== undefined && s !== null) parts.push(`S: ${formatINRCurrency(s)}`);
                        if (m !== undefined && m !== null) parts.push(`M: ${formatINRCurrency(m)}`);
                        if (l !== undefined && l !== null) parts.push(`F: ${formatINRCurrency(l)}`);
                        return parts.length ? parts.join(' · ') : null;
                      }
                      const single = extractNumericValue(item.price ?? item.cost ?? item.amount);
                      return single !== null && single !== undefined ? formatINRCurrency(single) : null;
                    })();

                    const thumb = cleanMediaUrl(item.imageUrl || item.image);

                    if (isFoodServiceName(activeService?.name)) {
                      return (
                        <div
                          className={`service-modal__food-card ${isSelected ? 'selected' : ''}`}
                          key={item.id || item._id || index}
                          onClick={() => toggleServiceItem(activeService, item)}
                        >
                          <div className="service-modal__food-thumb">
                            {thumb ? <img src={thumb} alt={item.name || item.title || 'Item'} /> : <div className="service-modal__food-thumb--empty" />}
                          </div>
                          <div className="service-modal__food-body">
                            <div className="service-modal__food-top">
                              <p className="service-modal__item-name">{item.name || item.title || 'Untitled'}</p>
                              {item.vegType && <VegBadge vegType={resolveVegType(item.vegType)} />}
                            </div>
                            {item.description && <p className="service-modal__item-desc">{item.description}</p>}
                            {item.notes && <p className="service-modal__item-note">{item.notes}</p>}
                            <div className="service-modal__meta">
                              {priceLabel && <span className="service-modal__price">{priceLabel}</span>}
                              <button
                                type="button"
                                className={`service-modal__action ${isSelected ? 'remove' : 'add'}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleServiceItem(activeService, item);
                                }}
                              >
                                {isSelected ? 'Remove' : 'Add'}
                              </button>
                              {isSelected && <Check size={16} className="service-modal__selected" />}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const normalizedPrice = extractNumericValue(
                      item.price ?? item.cost ?? item.amount ?? item.fullPrice ?? item.halfPrice ?? item.largePrice ?? item.mediumPrice ?? item.smallPrice,
                    ) ?? null;

                    return (
                      <div
                        className={`service-modal__item ${isSelected ? 'selected' : ''}`}
                        key={item.id || item._id || index}
                        onClick={() => toggleServiceItem(activeService, item)}
                      >
                        <div>
                          <p className="service-modal__item-name">{item.name || item.title || 'Untitled'}</p>
                          {item.description && (
                            <p className="service-modal__item-desc">{item.description}</p>
                          )}
                          {item.notes && <p className="service-modal__item-note">{item.notes}</p>}
                        </div>
                        <div className="service-modal__meta">
                          {normalizedPrice !== null && (
                            <span className="service-modal__price">{formatINRCurrency(normalizedPrice)}</span>
                          )}
                          {item.duration && <span className="service-modal__tag">{item.duration}</span>}
                          <button
                            type="button"
                            className={`service-modal__action ${isSelected ? 'remove' : 'add'}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleServiceItem(activeService, item);
                            }}
                          >
                            {isSelected ? 'Remove' : 'Add'}
                          </button>
                          {isSelected && <Check size={16} className="service-modal__selected" />}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="service-modal__empty">No items configured for this service.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showMoviesModal && (
        <MoviesModal
          isOpen={showMoviesModal}
          onClose={() => setShowMoviesModal(false)}
          onMovieSelect={handleMovieSelect}
          selectedMovies={selectedMovieName ? [selectedMovieName] : []}
        />
      )}
      <GlobalDatePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateSelect={(nextDate) => {
          handleInputChange("date", nextDate);
          setIsDatePickerOpen(false);
        }}
        selectedDate={formData.date || defaultDisplayDate}
        allowPastDates
      />

      <style jsx>{`
        .edit-booking-page {
          padding: 24px;
          color: #f5f5f5;
          background: #060606;
          min-height: 100vh;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .header-titles h1 {
          margin: 0;
        }
        .meta-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        @media (min-width: 600px) {
          .meta-row {
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 16px;
          }
        }
        .editor-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }
        .badge.admin {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
        }
        .badge.staff {
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
        }
        .badge.unknown {
          background: rgba(148, 163, 184, 0.2);
          color: #cbd5f5;
        }
        .editor-details {
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.9rem;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .ghost-btn,
        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }
        .ghost-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #f5f5f5;
        }
        .ghost-btn.danger {
          color: #f87171;
        }
        .primary-btn {
          background: linear-gradient(135deg, #ec4899, #a855f7);
          color: white;
        }
        .ghost-btn:disabled,
        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading-state,
        .alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .loading-state {
          background: rgba(255, 255, 255, 0.05);
        }
        .alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }
        .alert.success {
          background: rgba(34, 197, 94, 0.1);
          color: #86efac;
        }
        .edit-layout {
          display: grid;
          grid-template-columns: minmax(0, 2.2fr) minmax(280px, 0.8fr);
          gap: 24px;
        }
        @media (max-width: 1100px) {
          .edit-layout {
            grid-template-columns: 1fr;
          }
        }
        .edit-card {
          background: rgba(15, 15, 15, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .section-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
        }
        .section-subtitle {
          margin: 4px 0 0 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.9rem;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid.two {
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .grid.three {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .form-control {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-control label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .form-control input,
        .form-control select,
        .form-control textarea {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 12px;
          color: white;
          font-size: 0.95rem;
        }
        .date-picker-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: border 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          appearance: none;
        }
        .date-picker-trigger.empty {
          color: rgba(255, 255, 255, 0.55);
        }
        .date-picker-trigger:hover,
        .date-picker-trigger:focus-visible {
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.3);
          outline: none;
        }
        .date-picker-trigger__value {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .date-picker-trigger__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.7);
        }
        .form-control textarea {
          resize: vertical;
        }
        .form-control.required label::after {
          content: "*";
          margin-left: 4px;
          color: #ef4444;
        }
        .form-control input.invalid,
        .form-control select.invalid,
        .form-control textarea.invalid {
          border-color: rgba(239, 68, 68, 0.85);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .form-control input.valid,
        .form-control select.valid,
        .form-control textarea.valid {
          border-color: rgba(34, 197, 94, 0.6);
        }
        .form-control.required.invalid input {
          background: rgba(239, 68, 68, 0.06);
        }
        .fee-breakdown {
          margin-top: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.02);
        }
        .fee-breakdown.active {
          border-color: rgba(34, 197, 94, 0.35);
          background: rgba(34, 197, 94, 0.06);
        }
        .fee-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .fee-label {
          margin: 0;
          font-weight: 600;
          color: #f5f5f5;
        }
        .fee-desc {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fee-desc__line {
          display: block;
        }
        .fee-value {
          font-weight: 600;
          color: #a5b4fc;
        }
        .validation-hint {
          color: #fca5a5;
          font-size: 0.78rem;
          margin-top: -2px;
        }
        :global(.styled-dropdown) {
          position: relative;
          width: 100%;
        }
        :global(.styled-dropdown__toggle) {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--dropdown-text, #f9fafb);
          font-size: 0.95rem;
          cursor: pointer;
          transition: border 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        :global(.styled-dropdown__toggle:hover),
        :global(.styled-dropdown.open .styled-dropdown__toggle) {
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.3);
        }
        :global(.styled-dropdown.disabled .styled-dropdown__toggle) {
          opacity: 0.5;
          cursor: not-allowed;
        }
        :global(.styled-dropdown__value) {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }
        :global(.styled-dropdown__value .option-icon) {
          font-size: 1rem;
        }
        :global(.styled-dropdown .chevron) {
          transition: transform 0.2s ease;
          color: rgba(255, 255, 255, 0.7);
        }
        :global(.styled-dropdown.open .chevron) {
          transform: rotate(180deg);
        }
        :global(.styled-dropdown__list) {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 100%;
          background: rgba(10, 10, 10, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 8px;
          margin: 0;
          list-style: none;
          max-height: 220px;
          overflow-y: auto;
          box-shadow: 0 18px 35px rgba(0, 0, 0, 0.55);
          opacity: 0;
          pointer-events: none;
          transform: translateY(-6px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 30;
        }
        :global(.styled-dropdown.open .styled-dropdown__list) {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
        :global(.styled-dropdown__option) {
          width: 100%;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.92rem;
          padding: 10px 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        :global(.styled-dropdown__option .option-content) {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        :global(.styled-dropdown__option:hover),
        :global(.styled-dropdown__option.active) {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.95);
        }
        :global(.styled-dropdown__option.selected) {
          background: rgba(34, 197, 94, 0.18);
          color: #bbf7d0;
          font-weight: 700;
        }
        :global(.styled-dropdown__option.booked .option-label) { color: #ef4444; font-weight: 700; }
        :global(.styled-dropdown__option.booked) { background: rgba(239, 68, 68, 0.08); }
        :global(.styled-dropdown__option.going .option-label) { color: #f59e0b; font-weight: 700; }
        }
        .styled-dropdown__option .option-check {
          color: #a5b4fc;
        }
        .form-control.checkbox {
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }
        .form-control.checkbox input {
          width: 18px;
          height: 18px;
        }
        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 12px;
        }
        .input-with-icon input {
          background: transparent;
          border: none;
          padding: 0;
        }
        .muted {
          color: rgba(255, 255, 255, 0.5);
        }
        .pill {
          padding: 4px 10px;
          background: rgba(236, 72, 153, 0.15);
          border-radius: 999px;
          font-size: 0.85rem;
          color: #f9a8d4;
        }
        .dynamic-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 12px;
        }
        .service-library {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .service-library.simple {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        .service-total-bar {
          margin-top: 18px;
          padding: 14px 18px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.08));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .service-total-bar__info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .service-total-bar__title {
          font-weight: 600;
          font-size: 1rem;
          color: #d1fae5;
          margin: 0;
        }
        .service-total-bar__breakdown {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .service-total-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.16);
          border: 1px solid rgba(16, 185, 129, 0.25);
          font-size: 0.85rem;
          color: #ecfdf5;
        }
        .service-total-chip__label {
          font-weight: 500;
        }
        .service-total-chip__amount {
          font-weight: 600;
        }
        .service-total-bar__amount {
          font-weight: 700;
          font-size: 1.2rem;
          color: #34d399;
          white-space: nowrap;
        }
        .service-chip-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .service-chip__selected-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .coupon-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 149, 0, 0.15);
          border: 1px solid rgba(255, 179, 0, 0.35);
          color: #ff6600ff;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .coupon-chip.inline {
          margin-left: 12px;
        }
        .coupon-chip.pill {
          align-self: flex-start;
          margin-top: 4px;
        }
        .coupon-code-display {
          max-width: 260px;
        }
        .selected-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 6px 8px;
        }
        .selected-item__thumb {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          overflow: hidden;
          background: #151515;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 28px;
        }
        .selected-item__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .selected-item__placeholder {
          font-size: 14px;
        }
        .selected-item__name {
          font-size: 12.5px;
          color: #eaeaea;
          line-height: 1.2;
          word-break: break-word;
        }
        .service-chip {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.04);
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          text-align: center;
          transition: border 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .service-chip:hover {
          border-color: rgba(34, 197, 94, 0.8);
          background: rgba(34, 197, 94, 0.15);
        }
        .service-chip.primary {
          border-color: rgba(59, 130, 246, 0.8);
          background: rgba(59, 130, 246, 0.15);
        }
        .service-chip.ghost {
          border-style: dashed;
          color: rgba(255, 255, 255, 0.8);
        }
        .service-chip.movie-chip {
          position: relative;
          border-radius: 18px;
          padding: 18px 52px 18px 20px;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          overflow: hidden;
        }
        .service-chip.movie-chip .service-chip__badge {
          position: relative;
          background: rgba(15, 23, 42, 0.65);
          padding: 2px 12px;
        }
        .movie-chip__background {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: block;
          pointer-events: none;
        }
        .movie-chip__background img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .movie-chip__placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          opacity: 0.8;
        }
        .movie-chip__gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(12, 12, 12, 0.6) 45%, rgba(15, 23, 42, 0.2) 75%, rgba(15, 23, 42, 0.05) 100%);
          pointer-events: none;
        }
        .movie-chip__content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          width: 100%;
          color: #f8fafc;
          text-align: left;
        }
        .movie-chip__label {
          font-weight: 600;
          font-size: 1rem;
          text-shadow: 0 3px 10px rgba(0, 0, 0, 0.75);
        }
        .movie-chip__remove {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          border: none;
          background: rgba(239, 68, 68, 0.9);
          color: #ffffff;
          border-radius: 50%;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
          transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .movie-chip__remove:hover {
          background: rgba(248, 113, 113, 0.95);
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 10px 24px rgba(248, 113, 113, 0.45);
        }
        .movie-chip__remove:active {
          transform: scale(0.9);
        }
        .service-chip__badge {
          background: rgba(255, 255, 255, 0.12);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          color: white;
        }
        .item-row {
          display: grid;
          grid-template-columns: minmax(140px, 1fr) 110px 90px 44px;
          gap: 8px;
          margin-top: 10px;
        }
        @media (max-width: 700px) {
          .item-row {
            grid-template-columns: 1fr;
          }
        }
        .ghost-btn:hover,
        .primary-btn:hover {
          opacity: 0.85;
        }
        .stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .info-card ul {
          padding-left: 18px;
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.65);
        }
        .info-card li {
          margin-bottom: 6px;
        }
        /* Service modal popup overlay */
        .service-modal__backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .service-modal {
          width: min(900px, 96vw);
          max-height: 85vh;
          background: rgba(15, 15, 15, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.55);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .service-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .service-modal__eyebrow {
          margin: 0 0 2px 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .service-modal__description {
          margin: 6px 0 0 0;
          color: rgba(255, 255, 255, 0.7);
        }
        .service-modal__list {
          padding: 12px;
          overflow: auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .service-modal__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: border 0.2s ease, background 0.2s ease;
        }
        .service-modal__item:hover {
          border-color: rgba(59, 130, 246, 0.6);
          background: rgba(59, 130, 246, 0.12);
        }
        .service-modal__item.selected {
          border-color: rgba(34, 197, 94, 0.7);
          background: rgba(34, 197, 94, 0.14);
        }
        .service-modal__item-name {
          margin: 0 0 4px 0;
          font-weight: 600;
        }
        .service-modal__item-desc {
          margin: 0;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .service-modal__item-note {
          margin: 2px 0 0 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.55);
        }
        .service-modal__meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .service-modal__price {
          color: #fbbf24;
          font-weight: 700;
        }
        .service-modal__tag {
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
        }
        .service-modal__selected {
          color: #22c55e;
        }
        .service-modal__action {
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .service-modal__action.add {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
        }
        .service-modal__action.remove {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.45);
          color: #fecaca;
        }
        .service-modal__action:hover {
          opacity: 0.9;
        }
        .service-modal__empty {
          padding: 8px 10px;
          color: rgba(255, 255, 255, 0.65);
          text-align: center;
        }

        .service-modal__food-controls {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .service-modal__food-filter {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .service-modal__food-filter span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .service-modal__food-filter select {
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          padding: 8px 10px;
          border-radius: 10px;
          outline: none;
        }

        .service-modal__food-filter input[type="text"] {
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          padding: 8px 10px;
          border-radius: 10px;
          outline: none;
          width: 100%;
          min-width: 180px;
        }

        .service-modal__food-filter input[type="number"] {
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          padding: 8px 10px;
          border-radius: 10px;
          outline: none;
          width: 120px;
        }

        .service-modal__food-filter input[type="text"]:focus {
          border-color: rgba(59, 130, 246, 0.7);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
        }

        .service-modal__food-filter input[type="number"]:focus {
          border-color: rgba(59, 130, 246, 0.7);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
        }

        .service-modal__food-filter input[type="number"]::-webkit-outer-spin-button,
        .service-modal__food-filter input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .service-modal__food-filter input[type="number"] {
          -moz-appearance: textfield;
        }

        .service-modal__food-filter select:focus {
          border-color: rgba(59, 130, 246, 0.7);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
        }

        .service-modal__food-filter select option {
          background: #000;
          color: #fff;
        }

        .service-modal__food-grid {
          padding: 14px;
          overflow: auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .service-modal__food-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          display: flex;
          gap: 12px;
          padding: 12px;
          transition: border 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .service-modal__food-card:hover {
          border-color: rgba(59, 130, 246, 0.6);
          background: rgba(59, 130, 246, 0.12);
          transform: translateY(-1px);
        }

        .service-modal__food-card.selected {
          border-color: rgba(34, 197, 94, 0.7);
          background: rgba(34, 197, 94, 0.12);
        }

        .service-modal__food-thumb {
          width: 76px;
          height: 76px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .service-modal__food-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .service-modal__food-thumb--empty {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
        }

        .service-modal__food-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .service-modal__food-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .veg-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }

        .veg-badge__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .veg-badge.veg {
          color: #86efac;
          border-color: rgba(34, 197, 94, 0.35);
          background: rgba(34, 197, 94, 0.08);
        }

        .veg-badge.veg .veg-badge__dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
        }

        .veg-badge.non-veg {
          color: #fecaca;
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
        }

        .veg-badge.non-veg .veg-badge__dot {
          background: #dc2626;
          box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.22);
        }
        .capacity-hint {
          margin-top: 6px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .edit-side .edit-card:last-child {
          margin-bottom: 0;
        }
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

