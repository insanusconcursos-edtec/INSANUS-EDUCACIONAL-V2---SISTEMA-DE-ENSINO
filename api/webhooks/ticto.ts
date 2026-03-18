import type { VercelRequest, VercelResponse } from '@vercel/node';
import { provisionTictoPurchase, revokeTictoPurchase } from '../../src/backend/services/provisioningService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Bloqueia métodos diferentes de POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    
    // 2. Validação de Segurança (Token da Ticto)
    const tictoToken = "Zbi2TLCWBPbYJU1Xz14JF7gt8LGm8LQ0tNfMzGcu0US35mR56ye4PFU44We9c5eHcYU6wDzNxNOkx13UDWsVd7FHzI1brmjRrt0i";
    if (payload?.token !== tictoToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 3. Interceptar testes da Ticto imediatamente e retornar MENSAGEM LIMPA (Sem Echo)
    if (payload?.status === 'waiting_payment' || payload?.item?.product_id === 1) {
      return res.status(200).json({ received: true, message: "Teste Ticto Aprovado" });
    }

    // 4. Separação dos dados para venda real
    const { status, customer, item } = payload;

    // 5. Executa a lógica de negócio de forma segura
    if (status === 'approved' || status === 'paid') {
      await provisionTictoPurchase(customer, String(item.product_id));
    } else if (['refunded', 'chargeback', 'canceled', 'overdue'].includes(status)) {
      await revokeTictoPurchase(customer.email, String(item.product_id));
    }

    // 6. Retorno de SUCESSO LIMPO E ESTÁTICO (Sem Echo)
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Erro interno Webhook:", error);
    // 7. Retorno de ERRO LIMPO (Garante que a Ticto não desative o webhook)
    return res.status(200).json({ received: true, error: "Erro silenciado internamente" });
  }
}
