import { NextRequest, NextResponse } from 'next/server';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`RPC request to ${url} timed out after 30 seconds (attempt ${i + 1}/${retries})`);
    }, 30000); // 30-second timeout

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (i === retries - 1) {
        console.error(`RPC fetch failed after ${retries} attempts:`, error);
        throw error;
      }
      console.log(`Retrying RPC request (${i + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unexpected retry failure');
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    console.log('RPC Proxy request:', JSON.stringify(body));

    // Extract the method and id for error reporting
    const { method, id, params } = body;

    // Log additional context for eth_getLogs
    if (method === 'eth_getLogs' && params?.[0]) {
      console.log(`eth_getLogs params: address=${params[0].address}, fromBlock=${params[0].fromBlock}, toBlock=${params[0].toBlock}`);
    }

    // Forward the request to the RPC endpoint with retries
    try {
      const response = await fetchWithRetry('https://carrot.megaeth.com/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      });

      // Log the raw response status
      console.log(`RPC endpoint response status: ${response.status} ${response.statusText}`);

      // Get response text for debugging
      const responseText = await response.text();
      console.log(`RPC raw response (length: ${responseText.length}): ${responseText.substring(0, 100)}...`);

      // Parse response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse RPC response as JSON:', jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      // Check if the RPC endpoint returned an error
      if (data.error) {
        console.error('RPC endpoint returned error:', data.error);
      }

      // Return the proxied response
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error(`RPC fetch error for method ${method}:`, fetchError);

      // Format error according to JSON-RPC spec
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32603, // Internal error code per JSON-RPC spec
          message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        },
      });
    }
  } catch (error) {
    console.error('RPC proxy error (request parsing):', error);

    // Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700, // Parse error per JSON-RPC spec
        message: 'Invalid JSON was received by the server',
        data: errorMessage,
      },
    });
  }
}