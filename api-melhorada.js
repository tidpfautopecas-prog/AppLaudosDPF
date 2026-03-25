import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Middlewares
app.use(cors()); // Permitir CORS para o frontend
app.use(bodyParser.json({ limit: '50mb' }));

// Log de inicialização
console.log('🚀 Servidor SharePoint API iniciando...');
console.log(`📁 Site: ${process.env.SITE_ID}`);
console.log(`📂 Biblioteca: ${process.env.LIBRARY_NAME}`);
console.log(`📍 Pasta: ${process.env.FOLDER_PATH}`);

// Função para obter token do Azure AD com retry
async function getAccessToken(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const params = new URLSearchParams();
      params.append('client_id', process.env.CLIENT_ID);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('client_secret', process.env.CLIENT_SECRET);
      params.append('grant_type', 'client_credentials');

      console.log(`🔐 Tentativa ${i + 1} - Obtendo token de acesso...`);

      const res = await fetch(`https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const data = await res.json();
      
      if (!data.access_token) {
        throw new Error(`Erro na autenticação: ${data.error_description || data.error}`);
      }

      console.log('✅ Token obtido com sucesso');
      return data.access_token;
      
    } catch (error) {
      console.error(`❌ Tentativa ${i + 1} falhou:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Delay progressivo
    }
  }
}

// Rota de status da API
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    config: {
      siteId: process.env.SITE_ID,
      library: process.env.LIBRARY_NAME,
      folder: process.env.FOLDER_PATH
    }
  });
});

// Rota principal para upload de PDF
app.post('/upload-pdf', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { fileName, fileBase64, ticketNumber, ticketTitle, isReport } = req.body;

    // Validações
    if (!fileName || !fileBase64) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios ausentes',
        required: ['fileName', 'fileBase64']
      });
    }

    // Log da requisição
    console.log(`📄 Iniciando upload: ${fileName}`);
    if (ticketNumber) console.log(`🎫 Laudo: ${ticketNumber} - ${ticketTitle}`);
    if (isReport) console.log(`📊 Tipo: Relatório`);

    // Obter token de acesso
    const accessToken = await getAccessToken();

    // Construir URL de upload
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${process.env.SITE_ID}/drives/root:/${process.env.LIBRARY_NAME}/${process.env.FOLDER_PATH}/${fileName}:/content`;
    
    console.log(`⬆️ Enviando para SharePoint...`);

    // Upload do arquivo
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf'
      },
      body: Buffer.from(fileBase64, 'base64')
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SharePoint Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const uploadTime = Date.now() - startTime;

    // Log de sucesso
    console.log(`✅ Upload concluído em ${uploadTime}ms`);
    console.log(`📍 URL: ${result.webUrl}`);

    // Resposta de sucesso
    res.status(200).json({ 
      success: true,
      message: 'PDF enviado com sucesso para o SharePoint!',
      fileName,
      uploadTime: `${uploadTime}ms`,
      sharePointUrl: result.webUrl,
      fileSize: `${Math.round(fileBase64.length * 0.75 / 1024)} KB`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const uploadTime = Date.now() - startTime;
    
    console.error(`❌ Erro no upload (${uploadTime}ms):`, error.message);
    
    // Resposta de erro detalhada
    res.status(500).json({ 
      success: false,
      error: 'Falha ao enviar PDF para o SharePoint',
      details: error.message,
      uploadTime: `${uploadTime}ms`,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        checkToken: 'Verifique se as credenciais estão corretas',
        checkPermissions: 'Confirme permissões no SharePoint',
        checkNetwork: 'Teste conectividade com graph.microsoft.com'
      }
    });
  }
});

// Rota para testar conectividade
app.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com SharePoint...');
    
    const accessToken = await getAccessToken();
    
    // Testar acesso ao site
    const testUrl = `https://graph.microsoft.com/v1.0/sites/${process.env.SITE_ID}`;
    const response = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar site: ${response.status}`);
    }

    const siteInfo = await response.json();
    
    console.log('✅ Conexão testada com sucesso');
    
    res.json({
      success: true,
      message: 'Conexão com SharePoint funcionando!',
      siteInfo: {
        name: siteInfo.displayName,
        url: siteInfo.webUrl,
        id: siteInfo.id
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Teste de conexão falhou:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Falha na conexão com SharePoint',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('💥 Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Status: http://localhost:${PORT}/status`);
  console.log(`🧪 Teste: http://localhost:${PORT}/test-connection`);
  console.log('✅ API SharePoint pronta para receber uploads!');
});

export default app;