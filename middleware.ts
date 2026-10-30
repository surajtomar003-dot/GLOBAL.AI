// Supabase middleware hata diya: env vars na hon to poora app crash hota tha.
// Auth/DB wapas chahiye ho to tab add karenge, jab app stable ho.
import { NextResponse } from "next/server";
export function middleware() { return NextResponse.next(); }
export const config = { matcher: [] };
