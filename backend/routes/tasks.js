import express from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  shareTask,
  exportTasks,
  getTaskStats,
  searchTasks
} from "../controllers/taskController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { transporter } from "../utils/mailer.js";
import mongoose from "mongoose";

const router = express.Router();

// ✅ Routes principales CRUD
router.get("/", verifyToken, getTasks);
router.post("/", verifyToken, createTask);
router.put("/:id", verifyToken, updateTask);
router.delete("/:id", verifyToken, deleteTask);

// ✅ Upload de fichiers
router.post("/upload", verifyToken, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "Aucun fichier envoyé" });
    }
    
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    console.log("Fichier uploadé:", fileUrl);
    
    res.status(200).json({ 
      fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error("Erreur upload:", error);
    res.status(500).json({ msg: "Erreur lors de l'upload" });
  }
});

// ✅ Recherche avancée
router.get("/search", verifyToken, searchTasks);

// ✅ Stats et analytics
router.get("/stats", verifyToken, getTaskStats);

// ✅ Export
router.get("/export", verifyToken, exportTasks);

// ✅ Modules de l'utilisateur (pour auto-complétion)
router.get("/modules", verifyToken, async (req, res) => {
  try {
    const modules = await Task.distinct("module", { 
      owners: req.user.email,
      module: { $exists: true, $ne: "" },
      statut: { $ne: 'supprimée' }
    });
    res.json(modules.sort());
  } catch (err) {
    console.error("Erreur récupération modules:", err);
    res.status(500).json({ msg: "Erreur récupération modules", error: err.message });
  }
});

// ✅ Vue Kanban (groupé par statut)
router.get("/kanban", verifyToken, async (req, res) => {
  try {
    const { module, priority } = req.query;
    
    let filter = { owners: req.user.email, statut: { $ne: 'supprimée' } };
    if (module) filter.module = new RegExp(module, 'i');
    if (priority) filter.priorite = priority;
    
    const tasks = await Task.find(filter).sort({ dateEcheance: 1 });
    
    const kanban = {
      "à faire": tasks.filter(t => t.statut === "à faire"),
      "en cours": tasks.filter(t => t.statut === "en cours"),
      "terminée": tasks.filter(t => t.statut === "terminée")
    };
    
    res.json(kanban);
  } catch (err) {
    console.error("Erreur vue Kanban:", err);
    res.status(500).json({ msg: "Erreur vue Kanban", error: err.message });
  }
});

// ✅ Partage et collaboration - Route existante améliorée
router.put("/share/:id", verifyToken, shareTask);

// 🆕 Retirer un collaborateur d'une tâche
router.put("/:id/unshare", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "ID de tâche invalide" });
    }

    // Validation email
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!email || !gmailRegex.test(email)) {
      return res.status(400).json({ msg: "Adresse Gmail valide requise" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ msg: "Tâche introuvable" });
    }

    // Vérifier que l'utilisateur actuel est propriétaire (premier owner)
    if (task.owners[0] !== req.user.email) {
      return res.status(403).json({ msg: "Seul le propriétaire peut retirer des collaborateurs" });
    }

    // Empêcher de se retirer soi-même si on est propriétaire
    if (email === req.user.email) {
      return res.status(400).json({ msg: "Le propriétaire ne peut pas se retirer de la tâche" });
    }

    // Vérifier que l'email est bien dans la liste des collaborateurs
    if (!task.owners.includes(email)) {
      return res.status(400).json({ msg: "Cet utilisateur ne collabore pas sur cette tâche" });
    }

    // Retirer l'email de la liste des propriétaires
    task.owners = task.owners.filter(owner => owner !== email);
    await task.save();

    // Envoyer un email de notification
    try {
      await transporter.sendMail({
        from: `"FocusTâche" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Accès retiré d'une tâche",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Accès retiré</h2>
            <p>Bonjour,</p>
            <p>Votre accès à la tâche suivante a été retiré :</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.titre}</h3>
              <p style="margin: 5px 0; color: #64748b;"><strong>Module:</strong> ${task.module}</p>
            </div>
            <p style="margin: 5px 0; color: #64748b;"><strong>Action effectuée par:</strong> ${req.user.email}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8;">FocusTâche</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Erreur envoi email retrait:", emailError);
    }

    console.log("Collaborateur retiré:", email, "de la tâche", task._id);
    res.json({ 
      msg: "Collaborateur retiré avec succès", 
      task,
      removedUser: email
    });
  } catch (err) {
    console.error("Erreur unshare:", err);
    res.status(500).json({ 
      msg: "Erreur lors du retrait du collaborateur", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🆕 Obtenir les notifications de l'utilisateur
router.get("/notifications", verifyToken, async (req, res) => {
  try {
    // Tâches récemment partagées avec l'utilisateur (dans les 7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSharedTasks = await Task.find({
      owners: req.user.email,
      createdAt: { $gte: sevenDaysAgo },
      statut: { $ne: 'supprimée' },
      $expr: { $gt: [{ $size: "$owners" }, 1] } // Tâches avec plus d'un propriétaire
    }).sort({ createdAt: -1 });

    // Tâches en retard
    const overdueTasks = await Task.find({
      owners: req.user.email,
      statut: { $ne: 'terminée', $ne: 'supprimée' },
      dateEcheance: { $lt: new Date() }
    }).sort({ dateEcheance: 1 });

    // Tâches dues aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueToday = await Task.find({
      owners: req.user.email,
      statut: { $ne: 'terminée', $ne: 'supprimée' },
      dateEcheance: { $gte: today, $lt: tomorrow }
    }).sort({ dateEcheance: 1 });

    const notifications = [
      ...recentSharedTasks.map(task => ({
        type: 'shared',
        message: `Nouvelle tâche partagée: "${task.titre}"`,
        task: task._id,
        date: task.createdAt
      })),
      ...overdueTasks.map(task => ({
        type: 'overdue',
        message: `Tâche en retard: "${task.titre}"`,
        task: task._id,
        date: task.dateEcheance
      })),
      ...tasksDueToday.map(task => ({
        type: 'due_today',
        message: `Échéance aujourd'hui: "${task.titre}"`,
        task: task._id,
        date: task.dateEcheance
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      notifications: notifications.slice(0, 10), // Limiter à 10 notifications
      counts: {
        total: notifications.length,
        overdue: overdueTasks.length,
        dueToday: tasksDueToday.length,
        recentShared: recentSharedTasks.length
      }
    });
  } catch (err) {
    console.error("Erreur notifications:", err);
    res.status(500).json({ msg: "Erreur récupération notifications" });
  }
});

// 🆕 Route pour obtenir les tâches collaboratives
router.get("/collaborative", verifyToken, async (req, res) => {
  try {
    const collaborativeTasks = await Task.find({
      owners: req.user.email,
      statut: { $ne: 'supprimée' },
      $expr: { $gt: [{ $size: "$owners" }, 1] } // Tâches avec plus d'un propriétaire
    }).sort({ updatedAt: -1 });

    const tasksByCollaborator = {};
    
    collaborativeTasks.forEach(task => {
      task.owners.forEach(email => {
        if (email !== req.user.email) {
          if (!tasksByCollaborator[email]) {
            tasksByCollaborator[email] = [];
          }
          tasksByCollaborator[email].push(task);
        }
      });
    });

    res.json({
      tasks: collaborativeTasks,
      byCollaborator: tasksByCollaborator,
      stats: {
        totalCollaborative: collaborativeTasks.length,
        uniqueCollaborators: Object.keys(tasksByCollaborator).length
      }
    });
  } catch (err) {
    console.error("Erreur tâches collaboratives:", err);
    res.status(500).json({ msg: "Erreur récupération tâches collaboratives" });
  }
});

// ✅ Route pour marquer une tâche comme vue
router.put("/:id/view", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owners: req.user.email },
      { lastViewedAt: new Date() },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    res.json({ msg: "Tâche marquée comme vue", task });
  } catch (err) {
    console.error("Erreur marking view:", err);
    res.status(500).json({ msg: "Erreur lors du marquage", error: err.message });
  }
});

// ✅ Route pour ajouter du temps passé
router.put("/:id/time", verifyToken, async (req, res) => {
  try {
    const { duration } = req.body; // en secondes
    
    if (!duration || duration <= 0) {
      return res.status(400).json({ msg: "Durée invalide" });
    }
    
    const task = await Task.findOne({ _id: req.params.id, owners: req.user.email });
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    await task.addTimeSpent(duration);
    
    res.json({ 
      msg: "Temps ajouté avec succès", 
      task,
      totalTime: task.timeSpent,
      progressPercentage: task.progressPercentage
    });
  } catch (err) {
    console.error("Erreur ajout temps:", err);
    res.status(500).json({ msg: "Erreur lors de l'ajout de temps", error: err.message });
  }
});

// ✅ Route pour incrémenter les pomodoros
router.put("/:id/pomodoro", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owners: req.user.email });
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    await task.incrementPomodoro();
    
    res.json({ 
      msg: "Pomodoro ajouté avec succès", 
      task,
      pomodoroCount: task.pomodoroCount
    });
  } catch (err) {
    console.error("Erreur pomodoro:", err);
    res.status(500).json({ msg: "Erreur lors de l'ajout du pomodoro", error: err.message });
  }
});

// ✅ Route pour ajouter un commentaire
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ msg: "Message requis" });
    }
    
    const task = await Task.findOne({ _id: req.params.id, owners: req.user.email });
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    await task.addComment(req.user.email, message.trim());
    
    res.json({ 
      msg: "Commentaire ajouté avec succès", 
      task,
      commentsCount: task.comments.length
    });
  } catch (err) {
    console.error("Erreur commentaire:", err);
    res.status(500).json({ msg: "Erreur lors de l'ajout du commentaire", error: err.message });
  }
});

// ✅ Route pour soft delete
router.put("/:id/soft-delete", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owners: req.user.email });
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    await task.softDelete();
    
    res.json({ msg: "Tâche archivée avec succès", task });
  } catch (err) {
    console.error("Erreur soft delete:", err);
    res.status(500).json({ msg: "Erreur lors de l'archivage", error: err.message });
  }
});

// ✅ Route pour restaurer une tâche supprimée
router.put("/:id/restore", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      owners: req.user.email,
      statut: 'supprimée'
    });
    
    if (!task) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    await task.restore();
    
    res.json({ msg: "Tâche restaurée avec succès", task });
  } catch (err) {
    console.error("Erreur restore:", err);
    res.status(500).json({ msg: "Erreur lors de la restauration", error: err.message });
  }
});

// ✅ Route pour obtenir les tâches en retard
router.get("/overdue", verifyToken, async (req, res) => {
  try {
    const overdueTasks = await Task.find({
      owners: req.user.email,
      statut: { $ne: 'terminée', $ne: 'supprimée' },
      dateEcheance: { $lt: new Date() }
    }).sort({ dateEcheance: 1 });
    
    res.json({
      count: overdueTasks.length,
      tasks: overdueTasks
    });
  } catch (err) {
    console.error("Erreur tâches en retard:", err);
    res.status(500).json({ msg: "Erreur récupération tâches en retard", error: err.message });
  }
});

// ✅ Route pour dupliquer une tâche
router.post("/:id/duplicate", verifyToken, async (req, res) => {
  try {
    const originalTask = await Task.findOne({ _id: req.params.id, owners: req.user.email });
    
    if (!originalTask) {
      return res.status(404).json({ msg: "Tâche non trouvée" });
    }
    
    // Créer une copie de la tâche
    const taskData = originalTask.toObject();
    delete taskData._id;
    delete taskData.createdAt;
    delete taskData.updatedAt;
    delete taskData.completedAt;
    delete taskData.comments;
    delete taskData.timeSpent;
    delete taskData.pomodoroCount;
    
    // Modifier quelques propriétés pour la copie
    taskData.titre = `${taskData.titre} (copie)`;
    taskData.statut = 'à faire';
    taskData.user = req.user.id;
    taskData.owners = [req.user.email];
    
    const duplicatedTask = await Task.create(taskData);
    
    res.status(201).json({
      msg: "Tâche dupliquée avec succès",
      original: originalTask._id,
      duplicate: duplicatedTask
    });
  } catch (err) {
    console.error("Erreur duplication:", err);
    res.status(500).json({ msg: "Erreur lors de la duplication", error: err.message });
  }
});

export default router;
