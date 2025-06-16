import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  titre: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  dateEcheance: { type: Date, required: true },
  priorite: { 
    type: String, 
    enum: ["basse", "moyenne", "haute"], 
    default: "moyenne" 
  },
  statut: { 
    type: String, 
    enum: ["à faire", "en cours", "terminée", "supprimée"], 
    default: "à faire" 
  },
  module: { type: String, required: true, trim: true }, 
  categorie: { 
    type: String, 
    enum: ["universitaire", "para-universitaire", "autre"],
    default: "autre"
  },
  
  
  lien: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v) || /^www\..+/.test(v) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(v);
      },
      message: "Veuillez entrer une URL valide"
    }
  },
  
  fichierUrl: { type: String, trim: true },
  owners: {
    type: [String],
    required: true,
    validate: {
      validator: function(emails) {
        return emails.every(email => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email));
      },
      message: "Toutes les adresses doivent être des emails Gmail valides"
    }
  },
  
 
  templateId: { type: String }, 
  dureeEstimee: { type: Number, min: 0 }, 
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task" }, 
  tags: [{ type: String, trim: true }], 
  rappels: [{
    date: { type: Date },
    message: { type: String },
    envoye: { type: Boolean, default: false }
  }],
  
  
  completedAt: { type: Date }, 
  deletedAt: { type: Date }, 
  lastViewedAt: { type: Date, default: Date.now }, 
  
 
  comments: [{
    author: { type: String, required: true }, 
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  
  timeSpent: { type: Number, default: 0, min: 0 }, 
  pomodoroCount: { type: Number, default: 0, min: 0 }, 
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


taskSchema.index({ 
  titre: "text", 
  description: "text", 
  module: "text",
  tags: "text"
}, {
  weights: {
    titre: 10,      
    module: 5,      
    description: 1, 
    tags: 3         
  }
});


taskSchema.index({ owners: 1, statut: 1, dateEcheance: 1 }); 
taskSchema.index({ owners: 1, priorite: 1 });
taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ dateEcheance: 1, statut: 1 }); 


taskSchema.virtual('isOverdue').get(function() {
  return this.statut !== 'terminée' && new Date() > this.dateEcheance;
});


taskSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const diffTime = this.dateEcheance - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});


taskSchema.virtual('progressPercentage').get(function() {
  if (!this.dureeEstimee || this.dureeEstimee === 0) return 0;
  return Math.min(100, Math.round((this.timeSpent / (this.dureeEstimee * 60)) * 100));
});


taskSchema.virtual('formattedUrl').get(function() {
  if (!this.lien) return null;
  if (this.lien.startsWith('http')) return this.lien;
  if (this.lien.startsWith('www.')) return `https://${this.lien}`;
  return `https://${this.lien}`;
});


taskSchema.pre('save', function(next) {
  if (this.isModified('statut')) {
    if (this.statut === 'terminée' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.statut !== 'terminée') {
      this.completedAt = undefined;
    }
  }
  
  // Mettre à jour lastViewedAt
  if (this.isModified() && !this.isNew) {
    this.lastViewedAt = new Date();
  }
  
  next();
});


taskSchema.pre(/^find/, function(next) {
  if (!this.getQuery().statut && !this.getQuery().includeDeleted) {
    this.find({ statut: { $ne: 'supprimée' } });
  }
  next();
});


taskSchema.statics.findActive = function(userEmail) {
  return this.find({ 
    owners: userEmail, 
    statut: { $in: ['à faire', 'en cours'] } 
  }).sort({ dateEcheance: 1 });
};

taskSchema.statics.findOverdue = function(userEmail) {
  return this.find({ 
    owners: userEmail, 
    statut: { $ne: 'terminée' },
    dateEcheance: { $lt: new Date() }
  }).sort({ dateEcheance: 1 });
};

taskSchema.statics.findByModule = function(userEmail, module) {
  return this.find({ 
    owners: userEmail, 
    module: new RegExp(module, 'i') 
  }).sort({ dateEcheance: 1 });
};

taskSchema.statics.getModules = function(userEmail) {
  return this.distinct("module", { 
    owners: userEmail,
    module: { $exists: true, $ne: "" }
  });
};

taskSchema.statics.getStats = function(userEmail) {
  return this.aggregate([
    { $match: { owners: userEmail, statut: { $ne: 'supprimée' } } },
    { 
      $group: {
        _id: "$statut",
        count: { $sum: 1 }
      }
    }
  ]);
};

taskSchema.methods.addComment = function(authorEmail, message) {
  this.comments.push({
    author: authorEmail,
    message: message.trim(),
    createdAt: new Date()
  });
  return this.save();
};

taskSchema.methods.addTimeSpent = function(duration) {
  if (duration > 0) {
    this.timeSpent += duration;
    this.lastViewedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

taskSchema.methods.incrementPomodoro = function() {
  this.pomodoroCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

taskSchema.methods.shareWith = function(email) {
  if (!this.owners.includes(email)) {
    this.owners.push(email);
    return this.save();
  }
  return Promise.resolve(this);
};

taskSchema.methods.softDelete = function() {
  this.statut = 'supprimée';
  this.deletedAt = new Date();
  return this.save();
};

taskSchema.methods.restore = function() {
  if (this.statut === 'supprimée') {
    this.statut = 'à faire';
    this.deletedAt = undefined;
    return this.save();
  }
  return Promise.resolve(this);
};

export default mongoose.model("Task", taskSchema);
