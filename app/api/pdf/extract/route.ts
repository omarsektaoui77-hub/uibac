import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, fileBuffer } = body;

    let buffer: Buffer;

    if (fileBuffer) {
      // If buffer is provided directly (base64 encoded)
      buffer = Buffer.from(fileBuffer, 'base64');
    } else if (fileUrl) {
      // If URL is provided, fetch the PDF
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json(
        { error: 'Either fileUrl or fileBuffer must be provided' },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const data = await pdf(buffer);
    
    return NextResponse.json({
      text: data.text,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Return mock data for development if PDF parsing fails
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        text: `Mock PDF content for development:
        
Chapter 1: Derivatives and Their Applications

1.1 Definition of Derivative
The derivative of a function f(x) at a point x = a is defined as:
f'(a) = lim[h->0] [f(a+h) - f(a)] / h

1.2 Basic Derivative Rules
- Power Rule: d/dx(x^n) = n*x^(n-1)
- Product Rule: d/dx(uv) = u'v + uv'
- Quotient Rule: d/dx(u/v) = (u'v - uv')/v^2
- Chain Rule: d/dx(f(g(x))) = f'(g(x)) * g'(x)

1.3 Applications of Derivatives
Derivatives are used to find:
- Rates of change
- Maximum and minimum values
- Tangent lines to curves
- Optimization problems

Example Problems:
1. Find the derivative of f(x) = 3x^4 - 2x^2 + 5
   Solution: f'(x) = 12x^3 - 4x

2. Find the equation of the tangent line to y = x^2 at x = 2
   Solution: y = 4x - 4

1.4 Higher Order Derivatives
The second derivative f''(x) represents the rate of change of the first derivative.
It is used to determine concavity and points of inflection.`,
        numPages: 5,
        info: { Title: 'Mock PDF Document' },
        metadata: { mock: true }
      });
    }

    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}
