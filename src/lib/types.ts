export interface Settings {
  id: number
  business_name: string
  currency: string
  margin_multiplier: number
  payment_info: string
  whatsapp: string
  delivery_zones: string
  advance_percent: number
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  package_size: number
  package_price: number
}

export interface Product {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  batch_size: number
  active: boolean
}

export interface RecipeItem {
  id: string
  product_id: string
  ingredient_id: string
  qty: number
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'en_produccion' | 'entregado' | 'cancelado'

export interface Order {
  id: string
  customer_name: string
  phone: string
  delivery_date: string
  address: string
  zone: string
  lat: number | null
  lng: number | null
  notes: string
  status: OrderStatus
  payment_confirmed: boolean
  receipt_url: string
  total: number
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  qty: number
  unit_price: number
}

export interface Complaint {
  id: string
  customer_name: string
  phone: string
  message: string
  status: 'nueva' | 'atendida'
  response: string
  created_at: string
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_produccion: 'En producción',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  en_produccion: 'bg-purple-100 text-purple-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-stone-200 text-stone-600',
}
