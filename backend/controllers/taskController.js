import Task from "../models/Task.js";
import Session from "../models/Session.js";
import { transporter } from "../utils/mailer.js";
import { uploadToDrive } from "../utils/google.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// ✅ GET toutes les tâches de l'utilisateur avec pagination et filtres
export const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      priority,
      module,
      category,
      sortBy = "dateEcheance",
      sortOrder = "asc",
      search,
      dateFrom,
      dateTo,
      includeDeleted = false
    } = req.query;

    // Construire le filtre
    let filter = { owners: req.user.email };

    // ✅ Gestion du statut (avec ou sans tâches supprimées)
    if (includeDeleted === 'true') {
      filter.includeDeleted = true;
    } else {
      filter.statut = { $ne: 'supprimée' };
    }

    if (status) filter.statut = status;
    if (priority) filter.priorite = priority;
    if (module) filter.module = new RegExp(module, 'i');
    if (category) filter.categorie = category;

    // Filtre par recherche textuelle
    if (search && search.trim()) {
      filter.$or = [
        { titre: new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') },
        { module: new RegExp(search.trim(), 'i') },
        { tags: new RegExp(search.trim(), 'i') }
      ];
    }

    // Filtre par date
    if (dateFrom || dateTo) {
      filter.dateEcheance = {};
      if (dateFrom) filter.dateEcheance.$gte = new Date(dateFrom);
      if (dateTo) filter.dateEcheance.$lte = new Date(dateTo);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // ✅ Utiliser lean() pour de meilleures performances

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error("Erreur getTasks:", err);
    res.status(500).json({ 
      msg: "Erreur serveur lors de la récupération des tâches", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ POST créer une tâche (amélioré)
export const createTask = async (req, res) => {
  try {
    // ✅ Validation des champs obligatoires
    const { titre, module, dateEcheance } = req.body;
    
    if (!titre || !titre.trim()) {
      return res.status(400).json({ msg: "Le titre est obligatoire" });
    }
    
    if (!module || !module.trim()) {
      return res.status(400).json({ msg: "Le module est obligatoire" });
    }
    
    if (!dateEcheance) {
      return res.status(400).json({ msg: "La date d'échéance est obligatoire" });
    }

    // ✅ Validation de la date
    const echeanceDate = new Date(dateEcheance);
    if (isNaN(echeanceDate.getTime())) {
      return res.status(400).json({ msg: "Date d'échéance invalide" });
    }

    // ✅ Validation de la durée estimée
    if (req.body.dureeEstimee && (isNaN(req.body.dureeEstimee) || req.body.dureeEstimee < 0)) {
      return res.status(400).json({ msg: "Durée estimée invalide" });
    }

    const task = await Task.create({
      ...req.body,
      user: req.user.id,
      owners: [req.user.email],
      titre: titre.trim(),
      module: module.trim()
    });

    console.log("Tâche créée:", task._id, task.titre);
    res.status(201).json(task);
  } catch (err) {
    console.error("Erreur createTask:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: "Erreur de validation", 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    res.status(400).json({ 
      msg: "Erreur lors de la création de la tâche", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ PUT mettre à jour une tâche (amélioré)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "ID de tâche invalide" });
    }

    // ✅ Validation des données mises à jour
    if (req.body.titre && !req.body.titre.trim()) {
      return res.status(400).json({ msg: "Le titre ne peut pas être vide" });
    }

    if (req.body.module && !req.body.module.trim()) {
      return res.status(400).json({ msg: "Le module ne peut pas être vide" });
    }

    if (req.body.dateEcheance) {
      const echeanceDate = new Date(req.body.dateEcheance);
      if (isNaN(echeanceDate.getTime())) {
        return res.status(400).json({ msg: "Date d'échéance invalide" });
      }
    }

    if (req.body.dureeEstimee && (isNaN(req.body.dureeEstimee) || req.body.dureeEstimee < 0)) {
      return res.status(400).json({ msg: "Durée estimée invalide" });
    }

    const updated = await Task.findOneAndUpdate(
      { _id: id, owners: req.user.email },
      {
        ...req.body,
        ...(req.body.titre && { titre: req.body.titre.trim() }),
        ...(req.body.module && { module: req.body.module.trim() })
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(403).json({ msg: "Tâche non trouvée ou non autorisée" });
    }

    console.log("Tâche mise à jour:", updated._id, updated.titre);
    res.json(updated);
  } catch (err) {
    console.error("Erreur updateTask:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: "Erreur de validation", 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    res.status(400).json({ 
      msg: "Erreur lors de la mise à jour de la tâche", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ DELETE supprimer une tâche (amélioré)
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "ID de tâche invalide" });
    }

    const deleted = await Task.findOneAndDelete({
      _id: id,
      owners: req.user.email
    });

    if (!deleted) {
      return res.status(403).json({ msg: "Tâche non trouvée ou non autorisée" });
    }

    console.log("Tâche supprimée:", deleted._id, deleted.titre);
    res.json({ msg: "Tâche supprimée avec succès", taskId: id });
  } catch (err) {
    console.error("Erreur deleteTask:", err);
    res.status(400).json({ 
      msg: "Erreur lors de la suppression de la tâche", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Recherche avancée (améliorée)
export const searchTasks = async (req, res) => {
  try {
    const { 
      q, 
      module, 
      priorite, 
      statut, 
      dateFrom, 
      dateTo,
      limit = 20,
      includeDeleted = false
    } = req.query;
    
    let filter = { owners: req.user.email };
    
    // ✅ Gestion des tâches supprimées
    if (includeDeleted !== 'true') {
      filter.statut = { $ne: 'supprimée' };
    }
    
    // ✅ Recherche textuelle améliorée
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { titre: searchRegex },
        { description: searchRegex },
        { module: searchRegex },
        { tags: searchRegex }
      ];
    }
    
    // Filtres additionnels
    if (module) filter.module = new RegExp(module, 'i');
    if (priorite) filter.priorite = priorite;
    if (statut) filter.statut = statut;
    
    // Filtre par date
    if (dateFrom || dateTo) {
      filter.dateEcheance = {};
      if (dateFrom) filter.dateEcheance.$gte = new Date(dateFrom);
      if (dateTo) filter.dateEcheance.$lte = new Date(dateTo);
    }
    
    const tasks = await Task.find(filter)
      .sort({ 
        // ✅ Tri par pertinence si recherche textuelle
        ...(q ? { score: { $meta: "textScore" } } : {}),
        dateEcheance: 1 
      })
      .limit(parseInt(limit))
      .lean();
      
    res.json({
      results: tasks,
      count: tasks.length,
      query: q,
      filters: { module, priorite, statut, dateFrom, dateTo }
    });
  } catch (err) {
    console.error("Erreur searchTasks:", err);
    res.status(500).json({ 
      msg: "Erreur lors de la recherche", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ PUT partager une tâche avec un autre utilisateur Gmail (amélioré)
export const shareTask = async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  // ✅ Validation de l'ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "ID de tâche invalide" });
  }

  // ✅ Validation email plus stricte
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!email || !gmailRegex.test(email)) {
    return res.status(400).json({ msg: "Adresse Gmail valide requise" });
  }

  // ✅ Empêcher de partager avec soi-même
  if (email === req.user.email) {
    return res.status(400).json({ msg: "Vous ne pouvez pas partager une tâche avec vous-même" });
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ msg: "Tâche introuvable" });
    }

    if (!task.owners.includes(req.user.email)) {
      return res.status(403).json({ msg: "Non autorisé à partager cette tâche" });
    }

    if (task.owners.includes(email)) {
      return res.status(400).json({ msg: "Cette tâche est déjà partagée avec cet utilisateur" });
    }

    await task.shareWith(email);

    // ✅ Envoi d'email amélioré et clean
    try {
      await transporter.sendMail({
        from: `"FocusTâche" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Une tâche vous a été partagée",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Nouvelle tâche partagée</h2>
            <p>Bonjour !</p>
            <p>Une tâche a été partagée avec vous dans FocusTâche.</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.titre}</h3>
              <p style="margin: 5px 0; color: #64748b;"><strong>Module:</strong> ${task.module}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>Priorité:</strong> ${task.priorite}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>Échéance:</strong> ${new Date(task.dateEcheance).toLocaleDateString('fr-FR')}</p>
              ${task.description ? `<p style="margin: 10px 0 0 0; color: #475569;"><strong>Description:</strong> ${task.description}</p>` : ''}
            </div>
            <p style="margin: 5px 0; color: #64748b;"><strong>Partagée par:</strong> ${req.user.email}</p>
            <p>Connectez-vous à l'application pour consulter et collaborer sur cette tâche.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8;">FocusTâche - Organisez votre travail efficacement</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Erreur envoi email:", emailError);
      // Ne pas faire échouer la requête si l'email échoue
    }

    console.log("Tâche partagée:", task._id, "avec", email);
    res.json({ 
      msg: "Tâche partagée avec succès", 
      task,
      sharedWith: email,
      totalOwners: task.owners.length
    });
  } catch (err) {
    console.error("Erreur shareTask:", err);
    res.status(500).json({ 
      msg: "Erreur lors du partage", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ GET statistiques sur les tâches (améliorées)
export const getTaskStats = async (req, res) => {
  try {
    // ✅ Utiliser l'agrégation pour de meilleures performances
    const statsResult = await Task.aggregate([
      { 
        $match: { 
          owners: req.user.email,
          statut: { $ne: 'supprimée' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          aFaire: { $sum: { $cond: [{ $eq: ["$statut", "à faire"] }, 1, 0] } },
          enCours: { $sum: { $cond: [{ $eq: ["$statut", "en cours"] }, 1, 0] } },
          terminees: { $sum: { $cond: [{ $eq: ["$statut", "terminée"] }, 1, 0] } },
          haute: { $sum: { $cond: [{ $eq: ["$priorite", "haute"] }, 1, 0] } },
          moyenne: { $sum: { $cond: [{ $eq: ["$priorite", "moyenne"] }, 1, 0] } },
          basse: { $sum: { $cond: [{ $eq: ["$priorite", "basse"] }, 1, 0] } },
          enRetard: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ["$statut", "terminée"] },
                    { $lt: ["$dateEcheance", new Date()] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          tempsTotal: { $sum: "$timeSpent" },
          pomodorosTotal: { $sum: "$pomodoroCount" }
        }
      }
    ]);

    const stats = statsResult[0] || {
      total: 0, aFaire: 0, enCours: 0, terminees: 0,
      haute: 0, moyenne: 0, basse: 0, enRetard: 0,
      tempsTotal: 0, pomodorosTotal: 0
    };

    // ✅ Calcul des pourcentages
    const total = stats.total;
    const pourcentages = {
      "à faire": total > 0 ? Math.round((stats.aFaire / total) * 100) : 0,
      "en cours": total > 0 ? Math.round((stats.enCours / total) * 100) : 0,
      "terminée": total > 0 ? Math.round((stats.terminees / total) * 100) : 0
    };

    res.json({
      total: stats.total,
      stats: {
        "à faire": stats.aFaire,
        "en cours": stats.enCours,
        "terminée": stats.terminees
      },
      priorites: {
        haute: stats.haute,
        moyenne: stats.moyenne,
        basse: stats.basse
      },
      pourcentages,
      metrics: {
        enRetard: stats.enRetard,
        tempsTotal: stats.tempsTotal, // en secondes
        tempsFormate: `${Math.floor(stats.tempsTotal / 3600)}h ${Math.floor((stats.tempsTotal % 3600) / 60)}min`,
        pomodorosTotal: stats.pomodorosTotal,
        productivite: total > 0 ? Math.round((stats.terminees / total) * 100) : 0
      }
    });
  } catch (err) {
    console.error("Erreur getTaskStats:", err);
    res.status(500).json({ 
      msg: "Erreur lors du calcul des statistiques", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ GET exporter les tâches en PDF (amélioré)
export const exportTasks = async (req, res) => {
  try {
    const { status, priority, module, dateFrom, dateTo } = req.query;
    
    // ✅ Construire le filtre pour l'export
    let filter = { owners: req.user.email, statut: { $ne: 'supprimée' } };
    if (status) filter.statut = status;
    if (priority) filter.priorite = priority;
    if (module) filter.module = new RegExp(module, 'i');
    if (dateFrom || dateTo) {
      filter.dateEcheance = {};
      if (dateFrom) filter.dateEcheance.$gte = new Date(dateFrom);
      if (dateTo) filter.dateEcheance.$lte = new Date(dateTo);
    }

    const tasks = await Task.find(filter).sort({ dateEcheance: 1 });

    // ✅ Créer le dossier exports s'il n'existe pas
    const exportsDir = "exports";
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `tasks-${req.user.id}-${Date.now()}.pdf`;
    const filePath = path.join(exportsDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // ✅ En-tête amélioré
    doc.fontSize(24).text("Mes Tâches FocusTâche", { align: 'center' });
    doc.fontSize(12).text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'center' });
    doc.text(`Utilisateur: ${req.user.email}`, { align: 'center' });
    doc.moveDown(2);

    // ✅ Statistiques
    doc.fontSize(14).text(`Résumé: ${tasks.length} tâche(s) exportée(s)`, { underline: true });
    doc.moveDown(1);

    // ✅ Contenu des tâches
    tasks.forEach((task, index) => {
      const yPosition = doc.y;
      
      // Vérifier si on a assez de place pour la tâche
      if (yPosition > 700) {
        doc.addPage();
      }

      doc.fontSize(12).text(`${index + 1}. ${task.titre}`, { continued: false });
      doc.fontSize(10)
         .text(`   Module: ${task.module}`)
         .text(`   Priorité: ${task.priorite}`)
         .text(`   Échéance: ${new Date(task.dateEcheance).toLocaleDateString('fr-FR')}`)
         .text(`   Statut: ${task.statut}`);
      
      if (task.description) {
        doc.text(`   Description: ${task.description}`);
      }
      
      if (task.dureeEstimee) {
        doc.text(`   Durée estimée: ${task.dureeEstimee} minutes`);
      }
      
      doc.moveDown(0.5);
    });

    doc.end();

    doc.on("finish", async () => {
      try {
        // ✅ Tentative d'upload vers Google Drive (optionnel)
        if (typeof uploadToDrive === 'function') {
          await uploadToDrive(filePath, `FocusTache_${req.user.email}_${Date.now()}.pdf`);
        }
      } catch (driveError) {
        console.warn("Avertissement upload Drive:", driveError.message);
        // Ne pas faire échouer l'export si Drive échoue
      }

      // ✅ Téléchargement et nettoyage
      res.download(filePath, `mes-taches-${new Date().toISOString().split('T')[0]}.pdf`, (err) => {
        if (err) {
          console.error("Erreur téléchargement:", err);
        }
        
        // Nettoyer le fichier temporaire
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn("Avertissement nettoyage:", cleanupError.message);
        }
      });
    });

    doc.on("error", (err) => {
      console.error("Erreur génération PDF:", err);
      res.status(500).json({ msg: "Erreur lors de la génération du PDF" });
    });

  } catch (err) {
    console.error("Erreur exportTasks:", err);
    res.status(500).json({ 
      msg: "Erreur lors de l'exportation", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
