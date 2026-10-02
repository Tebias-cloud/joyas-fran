import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export async function GET() {
  try {
    const isAdmin = await isAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return NextResponse.json({ isAdmin: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
