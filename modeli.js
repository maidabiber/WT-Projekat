const { DataTypes } = require("sequelize");
const sequelize = require("./baza.js");

const Scenario = sequelize.define('Scenario', {
    title: { type: DataTypes.STRING, allowNull: false }
}, {
    freezeTableName: true,
    timestamps: false
});

const Line = sequelize.define('Line', {
    lineId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT },
    nextLineId: { type: DataTypes.INTEGER, allowNull: true }
}, {
    freezeTableName: true,
    timestamps: false
});

const Delta = sequelize.define('Delta', {
    type: { type: DataTypes.STRING, allowNull: false },
    lineId: { type: DataTypes.INTEGER, allowNull: true },
    nextLineId: { type: DataTypes.INTEGER, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    oldName: { type: DataTypes.STRING, allowNull: true },
    newName: { type: DataTypes.STRING, allowNull: true },
    timestamp: { type: DataTypes.INTEGER, allowNull: false }
}, {
    freezeTableName: true,
    timestamps: false
});

const Checkpoint = sequelize.define('Checkpoint', {
    timestamp: { type: DataTypes.INTEGER, allowNull: false }
}, {
    freezeTableName: true,
    timestamps: false
});

// ovdje definisem veze izmedju tabela
Scenario.hasMany(Line, { foreignKey: 'scenarioId' });
Line.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Delta, { foreignKey: 'scenarioId' });
Delta.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Checkpoint, { foreignKey: 'scenarioId' });
Checkpoint.belongsTo(Scenario, { foreignKey: 'scenarioId' });

module.exports = { Scenario, Line, Delta, Checkpoint, sequelize };