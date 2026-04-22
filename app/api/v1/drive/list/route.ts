import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export const dynamic = 'force-dynamic';

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client as any });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json(
        { error: 'folderId parameter is required' },
        { status: 400 }
      );
    }

    // Check if we have Google Drive credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('Google Drive credentials not configured, returning mock data');
      // Return mock data for development
      return NextResponse.json({
        files: [
          {
            id: 'mock_pdf_1',
            name: 'Lesson 1 - Derivatives.pdf',
            mimeType: 'application/pdf',
            webViewLink: 'https://drive.google.com/file/d/mock_pdf_1/view',
            size: '245760',
            modifiedTime: '2024-01-15T10:30:00.000Z'
          },
          {
            id: 'mock_pdf_2',
            name: 'Lesson 2 - Integration.pdf',
            mimeType: 'application/pdf',
            webViewLink: 'https://drive.google.com/file/d/mock_pdf_2/view',
            size: '312320',
            modifiedTime: '2024-01-16T14:20:00.000Z'
          },
          {
            id: 'mock_pdf_3',
            name: 'Lesson 3 - Limits.pdf',
            mimeType: 'application/pdf',
            webViewLink: 'https://drive.google.com/file/d/mock_pdf_3/view',
            size: '189440',
            modifiedTime: '2024-01-17T09:15:00.000Z'
          }
        ]
      });
    }

    const drive = await getDriveClient();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/pdf'`,
      fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime), nextPageToken',
      pageSize: 50,
    });

    const files = response.data.files || [];

    return NextResponse.json({
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        size: file.size,
        modifiedTime: file.modifiedTime
      })),
      nextPageToken: response.data.nextPageToken
    });

  } catch (error) {
    console.error('Google Drive API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files from Google Drive' },
      { status: 500 }
    );
  }
}
