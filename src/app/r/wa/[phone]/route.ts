import { NextResponse } from 'next/server'

/**
 * Public redirect route (`/r/wa/[phone]`) used when a WhatsApp Message Template
 * has a URL button pointing to a `wa.me/<phone>` or `api.whatsapp.com` link.
 *
 * Meta rejects direct `wa.me` / `whatsapp.com` URLs inside template URL buttons
 * with error_subcode 2388081 ("Os botões não podem conter links diretos para o WhatsApp").
 * Routing the URL button through `/r/wa/<phone>` on our own domain satisfies Meta's
 * template validator while still opening `https://wa.me/<phone>` in 1 tap.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ phone: string }> },
) {
  const { phone } = await context.params
  const cleanPhone = String(phone || '').replace(/\D/g, '')
  if (!cleanPhone) {
    return NextResponse.redirect('https://wa.me/', 302)
  }

  const reqUrl = new URL(request.url)
  const text = reqUrl.searchParams.get('text')
  const target = new URL(`https://wa.me/${cleanPhone}`)
  if (text) {
    target.searchParams.set('text', text)
  }

  return NextResponse.redirect(target.toString(), 302)
}
