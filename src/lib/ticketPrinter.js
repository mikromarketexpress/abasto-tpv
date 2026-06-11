const EMPRESA = {
    nombre: 'MICRO MARKET EXPRESS',
    rif: 'J-12345678-9',
    direccion: 'AV. PRINCIPAL, LOCAL 1, CARACAS',
    telefono: '+58 412-1234567',
}

export function abrirTicketImpresion(datos) {
    const {
        idVenta,
        fecha,
        sesionCajaId,
        productos,
        pagos,
        vueltoUSD,
        vueltoBS,
        subtotalUSD,
        ivaUSD,
        totalUSD,
        totalBS,
        tasaBCV,
    } = datos

    const tasaValida = tasaBCV > 0 ? tasaBCV : 1

    const fmtUSD = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0.00'
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    }

    const fmtBS = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0,00'
        return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    }

    const fmtFecha = (iso) => {
        const d = new Date(iso)
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    }

    const efectivoUSD = parseFloat(String(pagos?.efectivo_usd || '0').replace(',', '.')) || 0
    const igft = efectivoUSD > 0 ? efectivoUSD * 0.03 : 0
    const totalConIGFT = totalUSD + igft

    const prodRows = productos.map(p => {
        const cantidad = Number(p.cantidad) || 1
        const precio = Number(p.precio_usd) || 0
        const totalItem = cantidad * precio
        return (
            '<div class="flex-space prod-row">' +
            '<span class="col-qty">' + cantidad + '</span>' +
            '<span class="col-desc">' + String(p.nombre || '').toUpperCase() + '</span>' +
            '<span class="col-iva">G</span>' +
            '<span class="col-price">' + fmtUSD(precio) + '</span>' +
            '<span class="col-total">' + fmtUSD(totalItem) + '</span>' +
            '</div>'
        )
    }).join('\n')

    let metodosHTML = ''
    const metodos = [
        { id: 'efectivo_usd', label: 'EFECTIVO USD' },
        { id: 'efectivo_bs', label: 'EFECTIVO BS' },
        { id: 'debito', label: 'DEBITO' },
        { id: 'pago_movil', label: 'PAGO MOVIL' },
        { id: 'bio_pago', label: 'BIO PAGO' },
        { id: 'transferencia', label: 'TRANSFERENCIA' },
    ]
    for (const m of metodos) {
        const val = parseFloat(String(pagos?.[m.id] || '0').replace(',', '.')) || 0
        if (val > 0) {
            const prefix = m.id === 'efectivo_usd' ? '$' : 'Bs'
            const formatted = m.id === 'efectivo_usd' ? fmtUSD(val) : fmtBS(val)
            metodosHTML += '<div class="flex-space pago-row"><span>' + m.label + '</span><span class="bold">' + prefix + ' ' + formatted + '</span></div>'
        }
    }

    let vueltoHTML = ''
    if (vueltoUSD > 0) {
        vueltoHTML += '<div class="flex-space pago-row"><span>✓ EFECTIVO USD</span><span class="bold vuelto-check">$ ' + fmtUSD(vueltoUSD) + '</span></div>'
    }
    if (vueltoBS > 0) {
        vueltoHTML += '<div class="flex-space pago-row"><span>✓ EFECTIVO BS</span><span class="bold vuelto-check">Bs ' + fmtBS(vueltoBS) + '</span></div>'
    }

    const igftHTML = igft > 0
        ? '<div class="flex-space total-row"><span>I.G.T.F. (3%)</span><span class="amt-usd">' + fmtUSD(igft) + '</span><span class="amt-bs">Bs ' + fmtBS(igft * tasaValida) + '</span></div>'
        : ''

    const ventana = window.open('', '_blank', 'width=400,height=600')
    if (!ventana) return

    ventana.document.write(
        '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>TICKET - ' + idVenta.slice(0, 8) + '</title>' +
        '<style>' +
        '@page { size: 80mm auto; margin: 0mm; }' +
        'html,body { margin: 0; padding: 0; width: 80mm; background: #ffffff !important; color: #000000 !important; font-family: "Courier New",Courier,monospace; font-size: 12px; -webkit-print-color-adjust: exact; }' +
        '.ticket-container { width: 72mm; margin: 0 auto; padding: 10px 0; box-sizing: border-box; }' +
        '.text-center { text-align: center; }' +
        '.text-right { text-align: right; }' +
        '.bold { font-weight: 700; }' +
        '.flex-space { display: flex; justify-content: space-between; }' +
        '.divider { margin: 5px 0; border-top: 1px dashed #000; }' +
        '.h1 { font-size: 16px; font-weight: 900; letter-spacing: 0.05em; }' +
        '.h3 { font-size: 12px; font-weight: 700; }' +
        '.small { font-size: 10px; }' +
        '.info-row { display: flex; justify-content: space-between; padding: 2px 0; }' +
        '.info-row span:first-child { color: #555; }' +
        '.prod-row { font-size: 11px; }' +
        '.prod-row .col-desc { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '.prod-row .col-qty { width: 10%; text-align: right; }' +
        '.prod-row .col-iva { width: 8%; text-align: center; }' +
        '.prod-row .col-price { width: 22%; text-align: right; }' +
        '.prod-row .col-total { width: 20%; text-align: right; }' +
        '.prod-header { font-weight: 700; font-size: 10px; border-bottom: 1px solid #000; padding: 2px 0; }' +
        '.total-row { padding: 2px 0; font-size: 11px; }' +
        '.total-row .amt-usd { text-align: right; min-width: 70px; }' +
        '.total-row .amt-bs { text-align: right; min-width: 80px; font-size: 10px; color: #555; }' +
        '.total-final { font-size: 14px; font-weight: 900; }' +
        '.total-final .amt-usd { font-size: 14px; }' +
        '.total-final .amt-bs { font-size: 12px; color: #000; }' +
        '.pago-row { padding: 2px 0; font-size: 11px; }' +
        '.vuelto-check { color: #008000; }' +
        '.footer { margin-top: 6px; padding-top: 4px; border-top: 1px solid #000; }' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<div class="ticket-container">' +

        '<div class="text-center">' +
        '<div class="h1">' + EMPRESA.nombre + '</div>' +
        '<div class="small">RIF: ' + EMPRESA.rif + '</div>' +
        '<div class="small">' + EMPRESA.direccion + '</div>' +
        '<div class="small">TELF: ' + EMPRESA.telefono + '</div>' +
        '</div>' +

        '<div class="divider"></div>' +

        '<div class="text-center small"><b>FACTURA / NOTA DE ENTREGA</b></div>' +

        '<div class="divider"></div>' +

        '<div class="info-row"><span>No. CONTROL</span><span class="bold">' + idVenta.slice(0, 8).toUpperCase() + '</span></div>' +
        '<div class="info-row"><span>FECHA</span><span class="bold">' + fmtFecha(fecha) + '</span></div>' +
        '<div class="info-row"><span>SESION CAJA</span><span class="bold">' + (sesionCajaId ? String(sesionCajaId).slice(0, 15) : '-') + '</span></div>' +
        '<div class="info-row"><span>TASA BCV</span><span class="bold">Bs ' + fmtBS(tasaValida) + '</span></div>' +
        (datos.clienteNombre ? '<div class="info-row"><span>CLIENTE</span><span class="bold">' + String(datos.clienteNombre).toUpperCase() + '</span></div>' : '') +
        (datos.clienteIdentificacion ? '<div class="info-row"><span>' + (datos.clienteTipo === 'Persona Natural' ? 'CÉDULA' : 'RIF') + '</span><span class="bold">' + String(datos.clienteIdentificacion).toUpperCase() + '</span></div>' : '') +

        '<div class="divider"></div>' +

        '<div class="flex-space prod-header">' +
        '<span class="col-qty">CTD</span>' +
        '<span class="col-desc">DESCRIPCION</span>' +
        '<span class="col-iva">IVA</span>' +
        '<span class="col-price">P.UNIT</span>' +
        '<span class="col-total">TOTAL</span>' +
        '</div>' +

        prodRows +

        '<div class="divider"></div>' +

        '<div class="flex-space total-row"><span>SUBTOTAL BASE IMPONIBLE</span><span class="amt-usd">' + fmtUSD(subtotalUSD) + '</span><span class="amt-bs">Bs ' + fmtBS(subtotalUSD * tasaValida) + '</span></div>' +
        '<div class="flex-space total-row"><span>SUBTOTAL EXENTO</span><span class="amt-usd">0.00</span><span class="amt-bs">Bs 0,00</span></div>' +
        '<div class="flex-space total-row"><span>I.V.A. (16%)</span><span class="amt-usd">' + fmtUSD(ivaUSD) + '</span><span class="amt-bs">Bs ' + fmtBS(ivaUSD * tasaValida) + '</span></div>' +
        igftHTML +
        '<div class="flex-space total-row total-final"><span><b>TOTAL GENERAL</b></span><span class="amt-usd">' + fmtUSD(totalConIGFT) + ' $</span><span class="amt-bs">Bs ' + fmtBS(totalConIGFT * tasaValida) + '</span></div>' +

        '<div class="divider"></div>' +

        '<div class="h3 text-center">METODOS DE PAGO</div>' +
        '<div style="margin-top:3px">' + metodosHTML + '</div>' +

        (vueltoHTML ? '<div class="divider"></div><div class="h3 text-center">VUELTO ENTREGADO</div><div style="margin-top:3px">' + vueltoHTML + '</div>' : '') +

        '<div class="divider"></div>' +

        '<div class="text-center small">' +
        '<div>GRACIAS POR SU COMPRA!</div>' +
        '<div style="margin-top:3px">' + EMPRESA.nombre + '</div>' +
        '</div>' +

        '<div class="footer text-center small">' +
        'GENERADO: ' + fmtFecha(new Date().toISOString()) +
        '</div>' +

        '</div>' +
        '</body>' +
        '</html>'
    )

    ventana.document.close()
    ventana.focus()
    setTimeout(function() {
        ventana.print()
        ventana.close()
    }, 500)
}
