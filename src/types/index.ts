export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email?: string
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
  created_at: string
}

export interface ProfileWithStats extends Profile {
  orders?: Order[]
  totalOrders: number
  totalSpent: number
}

export interface Address {
  id: string
  user_id: string
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail_address: string
  is_default: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category_id: string | null
  images: string[]
  colors: string[]
  sizes: string[]
  is_active: boolean
  created_at: string
  category?: Category
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled'

export interface Order {
  id: string
  user_id: string
  address_id: string | null
  status: OrderStatus
  total_amount: number
  order_date: string
  created_at: string
  address?: Address
  items?: OrderItem[]
  user?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  color: string | null
  size: string | null
  created_at: string
  product?: Product
}

export interface CartItem {
  product: Product
  quantity: number
  color: string
  size: string
}