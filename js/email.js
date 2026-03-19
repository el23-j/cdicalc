/* ─────────────────────────────────────────────────────────────────────────
   email.js — HuquqPro PDF Generation & Email Integration
   ───────────────────────────────────────────────────────────────────────────── */

function getSuffix(moduleId) {
  return moduleId === 'cdi' ? '' : '-' + moduleId;
}

const moduleNames = {
  cdi: "Rupture CDI",
  cdd: "Rupture CDD",
  depart: "Départ Volontaire",
  cnss: "Cotisations CNSS",
  igr: "Calcul IGR / IR"
};

/**
 * Parses the DOM to extract simulation data, formats an HTML email, and generates a PDF.
 * Returns { base64Pdf, htmlEmail, totalAmount, modName }
 */
function extractDataAndGeneratePDF(moduleId, userName, userEmail) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const suffix = getSuffix(moduleId);
  
  // Extract DOM data
  const totalEl = document.querySelector(`#summary-grid${suffix} .card-total .card-value`);
  const totalAmount = totalEl ? totalEl.innerText.trim() : '0,00 MAD';
  
  const breakdownCards = document.querySelectorAll(`#breakdown-cards${suffix} .breakdown-card`);
  const tableRows = [];
  let htmlTableRows = "";
  
  breakdownCards.forEach(card => {
    const title = card.querySelector('.bc-title') ? card.querySelector('.bc-title').innerText : '';
    const ref = card.querySelector('.bc-ref') ? card.querySelector('.bc-ref').innerText : '';
    const amount = card.querySelector('.bc-amount') ? card.querySelector('.bc-amount').innerText : '';
    tableRows.push([title, ref, amount]);
    htmlTableRows += `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>${title}</strong><br><small style="color:#64748b">${ref}</small></td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${amount}</td>
    </tr>`;
  });
  
  const paramsEl = document.querySelectorAll(`#formula-grid${suffix} .formula-item`);
  const paramRows = [];
  let htmlParamRows = "";
  paramsEl.forEach(item => {
    const key = item.querySelector('.fi-key') ? item.querySelector('.fi-key').innerText : '';
    const val = item.querySelector('.fi-val') ? item.querySelector('.fi-val').innerText : '';
    paramRows.push(`${key}: ${val}`);
    htmlParamRows += `<li><strong>${key}:</strong> ${val}</li>`;
  });

  const modName = moduleNames[moduleId] || moduleId;
  const dateStr = new Date().toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' });

  // Draw PDF
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('HuquqPro - Code du Travail', 15, 15);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Simulation : ${modName} | Date : ${dateStr}`, 15, 24);
  
  doc.setTextColor(50, 50, 50);
  doc.text(`Prépare pour : ${userName || "Utilisateur"} — ${userEmail}`, 15, 40);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL ESTIME : ${totalAmount}`, 15, 50);
  
  doc.setFontSize(12);
  doc.text('Détail des calculs', 15, 62);
  
  if (tableRows.length > 0) {
    doc.autoTable({
      startY: 65,
      head: [['Rubrique', 'Référence', 'Montant']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { font: 'helvetica', fontSize: 10 }
    });
  }
  
  let finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 65) + 10;
  
  if (paramRows.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Base de calcul', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    paramRows.forEach((p, i) => {
      doc.text(p, 15, finalY + 6 + (i * 6));
    });
    finalY = finalY + 6 + (paramRows.length * 6) + 10;
  }
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Avertissement juridique', 15, finalY);
  doc.text('Simulation indicative uniquement. Ne constitue pas un avis juridique.', 15, finalY + 5);
  doc.text('Code du Travail marocaine - Loi n 65-99', 15, finalY + 10);
  
  // Set Metadata
  const dateIso = new Date().toISOString().split('T')[0];
  doc.setProperties({
    title: `Simulation HuquqPro - ${modName}`,
    author: 'HuquqPro'
  });
  
  const fullBase64 = doc.output('datauristring');
  const base64Clean = fullBase64.split('base64,')[1];
  const pdfFilename = `HuquqPro_${moduleId}_${dateIso}.pdf`;

  // Create HTML Email
  const htmlEmail = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <div style="background: #1a1a1a; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">HuquqPro — حقوق العمل</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Simulation : ${modName} | Date : ${dateStr}</p>
    </div>
    <div style="padding: 20px; border: 1px solid #eee;">
      <p>Bonjour ${userName || "Utilisateur"},</p>
      <p>Veuillez trouver ci-joint votre simulation détaillée au format PDF.</p>
      
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
        <h2 style="margin: 0; font-size: 20px; color: #1e3a8a;">TOTAL ESTIMÉ : ${totalAmount}</h2>
      </div>
      
      <h3>Détail des calculs</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px;">Rubrique</th>
            <th style="padding: 10px;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${htmlTableRows}
        </tbody>
      </table>
      
      <h3>Base de calcul</h3>
      <ul style="color: #64748b; font-size: 14px;">
        ${htmlParamRows}
      </ul>
      
      <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        ⚖ Avertissement légal : Simulation indicative uniquement. Ne constitue pas un avis juridique. Code du Travail — Loi n° 65-99.
      </p>
    </div>
  </div>`;

  // Remove totally clean numeric total for Airtable
  const rawTotal = parseFloat(totalAmount.replace(/[^\d,\.]/g, '').replace(',', '.'));

  return { base64Pdf: base64Clean, htmlEmail, totalAmount: (isNaN(rawTotal) ? 0 : rawTotal), modName, pdfFilename };
}

/**
 * Send Email via Brevo API
 */
async function sendEmailViaBrevo(base64Pdf, htmlEmail, userEmail, userName, modName, pdfFilename) {
  const payload = {
    sender: { name: HUQUQPRO_CONFIG.brevo.senderName, email: HUQUQPRO_CONFIG.brevo.senderEmail },
    to: [{ email: userEmail, name: userName || "Utilisateur" }],
    subject: `Votre simulation HuquqPro — ${modName}`,
    htmlContent: htmlEmail,
    attachment: [{
      name: pdfFilename,
      content: base64Pdf
    }]
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": HUQUQPRO_CONFIG.brevo.apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Erreur API Brevo');
  }
  return response.json();
}

/**
 * Save Lead to Airtable
 */
async function saveLeadToAirtable(userEmail, userName, moduleName, totalAmount) {
  const url = `https://api.airtable.com/v0/${HUQUQPRO_CONFIG.airtable.baseId}/${encodeURIComponent(HUQUQPRO_CONFIG.airtable.table)}`;
  
  const payload = {
    records: [{
      fields: {
        "Nom": userName || "—",
        "Email": userEmail,
        "Module": moduleName,
        "Total (MAD)": totalAmount,
        "Date": new Date().toISOString().split('T')[0],
        "Statut": "Nouveau"
      }
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HUQUQPRO_CONFIG.airtable.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erreur API Airtable');
  }
}

/**
 * Handle Full Flow Submit
 */
async function handleEmailSubmit(moduleId) {
  const suffix = getSuffix(moduleId);
  const nameInput = document.getElementById(`email-name${suffix}`);
  const emailInput = document.getElementById(`email-addr${suffix}`);
  const statusEl = document.getElementById(`email-status${suffix}`);
  const formWrap = document.getElementById(`email-form${suffix}`);
  const btnSend = document.querySelector(`.ef-send[data-module="${moduleId}"]`);
  const formCard = document.querySelector(`#email-form${suffix} .email-form-card`);

  const userName = nameInput.value.trim();
  const userEmail = emailInput.value.trim();

  // Basic validation
  if (!userEmail || !userEmail.includes('@')) {
    statusEl.innerHTML = `❌ Erreur : Adresse email invalide.`;
    statusEl.className = 'ef-status error';
    return;
  }

  // Loading State
  btnSend.disabled = true;
  btnSend.innerHTML = "⏳ Génération du PDF...";
  statusEl.innerHTML = "";
  statusEl.className = 'ef-status';

  try {
    // 1. Generate PDF & Email content
    const { base64Pdf, htmlEmail, totalAmount, modName, pdfFilename } = extractDataAndGeneratePDF(moduleId, userName, userEmail);
    
    // 2. Sending state
    btnSend.innerHTML = "📤 Envoi en cours...";

    // 3. Parallel API Calls
    const pEmail = sendEmailViaBrevo(base64Pdf, htmlEmail, userEmail, userName, modName, pdfFilename);
    const pAirtable = saveLeadToAirtable(userEmail, userName, modName, totalAmount)
      .catch(err => console.warn("Airtable warning non-bloquant :", err)); // Swallow Airtable error as requested

    await pEmail;
    await pAirtable;

    // 4. Success State
    formCard.innerHTML = `<div class="ef-success">
      <div class="ef-icon">✅</div>
      <p>Email envoyé avec succès !</p>
      <span>Veuillez vérifier votre boîte de réception (et vos indésirables).</span>
    </div>`;

  } catch (error) {
    console.error("Email Error:", error);
    statusEl.innerHTML = `❌ Erreur : ${error.message}. Réessayez.`;
    statusEl.className = 'ef-status error';
    btnSend.disabled = false;
    btnSend.innerHTML = "Envoyer la simulation";
  }
}

/**
 * Initialization (Bind events)
 */
function initEmailSystem() {
  // Bind main email trigger buttons to reveal the form
  document.querySelectorAll('.btn-email').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = btn.getAttribute('data-module');
      const suffix = getSuffix(moduleId);
      const formWrap = document.getElementById(`email-form${suffix}`);
      formWrap.classList.remove('hidden');
      setTimeout(() => formWrap.classList.add('visible'), 10);
    });
  });

  // Bind cancel buttons
  document.querySelectorAll('.ef-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = btn.getAttribute('data-module');
      const suffix = getSuffix(moduleId);
      const formWrap = document.getElementById(`email-form${suffix}`);
      formWrap.classList.remove('visible');
      setTimeout(() => formWrap.classList.add('hidden'), 300); // Wait for transition
    });
  });

  // Bind Send Buttons
  document.querySelectorAll('.ef-send').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleId = btn.getAttribute('data-module');
      handleEmailSubmit(moduleId);
    });
  });
}

document.addEventListener('DOMContentLoaded', initEmailSystem);
