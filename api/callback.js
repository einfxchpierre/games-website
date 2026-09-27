export default async function handler(req, res) {
    // Parameter aus der Anfrage lesen / Read parameters from request
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        // Dynamic Provider discovery via oauth.json / Dynamische Abfrage der oauth.json
        const oauthConfigUrl = 'https://phoenixmagie.vercel.app/.well-known/oauth.json';
        const configResponse = await fetch(oauthConfigUrl);
        
        if (!configResponse.ok) {
            throw new Error(`Failed to load OAuth config from ${oauthConfigUrl}`);
        }
        
        const oauthConfig = await configResponse.json();

        // Absoluten Token-Endpoint auflösen / Resolve absolute token endpoint URL
        let tokenEndpoint = oauthConfig.token_endpoint;
        if (!tokenEndpoint.startsWith('http')) {
            const baseUrl = oauthConfig.issuer ? oauthConfig.issuer : 'https://phoenixmagie.vercel.app';
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = tokenEndpoint.startsWith('/') ? tokenEndpoint : '/' + tokenEndpoint;
            tokenEndpoint = cleanBase + cleanPath;
        }

        // Dynamische Umgebungsvariablen verwenden / Use dynamic environment variables
        const clientId = process.env.OAUTH_CLIENT_ID;
        const clientSecret = process.env.OAUTH_CLIENT_SECRET;

        // POST-Payload für den Token-Austausch konfigurieren / Configure POST payload for token exchange
        const payload = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'https://games-phoenixmagie.vercel.app/api/callback',
            client_id: clientId,
            client_secret: clientSecret
        };

        // Code gegen Tokens eintauschen / Exchange authorization code for tokens
        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            return res.status(tokenResponse.status).json(tokenData);
        }

        // HTML-Antwort rendern & Token im Client speichern / Render HTML response & store tokens in client
        const html = `
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>Anmeldung erfolgreich</title>
                <style>
                    body {
                        background: #0f0f0f;
                        color: #ffffff;
                        font-family: sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <h2>Anmeldung erfolgreich! Leite weiter...</h2>
                <script>
                    localStorage.setItem('access_token', ${JSON.stringify(tokenData.access_token || '')});
                    if (${JSON.stringify(tokenData.refresh_token || null)}) {
                        localStorage.setItem('refresh_token', ${JSON.stringify(tokenData.refresh_token)});
                    }
                    window.location.href = '/konto.html';
                </script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        // Fehlerbehandlung / Error handling
        return res.status(500).json({ 
            error: 'Failed to exchange authorization code', 
            details: error.message 
        });
    }
}