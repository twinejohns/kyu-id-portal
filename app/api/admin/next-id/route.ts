import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const term = searchParams.get('term') || 'PERMANENT';

    // Fetch all applications with an ID assigned to calculate the next sequence
    const apps = await prisma.staffApplication.findMany({
      where: {
        generatedIdNumber: {
          not: null
        }
      },
      select: {
        generatedIdNumber: true
      }
    });

    let maxSeq = 1000; // Start sequences at 1001 for premium formatting

    apps.forEach(a => {
      if (a.generatedIdNumber) {
        // Match format: KYU-XXXX[P/C/T/L]
        const match = a.generatedIdNumber.match(/^KYU-(\d{4})[PCTL]$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    
    // Suffix mapping
    let suffix = 'P';
    if (term === 'CONTRACT') suffix = 'C';
    else if (term === 'TEMPORARY') suffix = 'T';
    else if (term === 'PARTTIME') suffix = 'L';

    const nextIdNumber = `KYU-${String(nextSeq).padStart(4, '0')}${suffix}`;

    return NextResponse.json({ success: true, nextIdNumber });
  } catch (error) {
    console.error('Error generating next ID number:', error);
    return NextResponse.json({ error: 'Failed to generate ID number' }, { status: 500 });
  }
}
