import User from './User.js'
import Bookmark from './Bookmark.js'

// Relasi: satu user memiliki banyak bookmark
User.hasMany(Bookmark, { foreignKey: 'userId', as: 'bookmarks' })
Bookmark.belongsTo(User, { foreignKey: 'userId', as: 'user' })

export { User, Bookmark }