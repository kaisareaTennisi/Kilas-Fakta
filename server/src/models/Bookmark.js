import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database.js'

class Bookmark extends Model {}

Bookmark.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    // newsId diambil dari id artikel sumber berita (bisa string apa pun dari News API)
    newsId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Tanpa Judul',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'umum',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Catatan pribadi user (hasil edit di halaman Bookmark)
    userNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    // Ringkasan AI 3-5 poin yang ikut tersimpan (teks, dipisah baris baru)
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Bookmark',
    tableName: 'bookmarks',
    indexes: [
      { unique: true, fields: ['userId', 'newsId'] }, // cegah duplikat bookmark per user
    ],
  },
)

export default Bookmark