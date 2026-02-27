import { openDB } from 'idb'

const DB_NAME = 'MicroMarketPOS'
const STORE_NAME = 'offline_sales'

export const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
            }
        },
    })
}

export const saveOfflineSale = async (sale) => {
    const db = await initDB()
    return db.add(STORE_NAME, {
        ...sale,
        timestamp: new Date().toISOString(),
        synced: false
    })
}

export const getOfflineSales = async () => {
    const db = await initDB()
    return db.getAll(STORE_NAME)
}

export const deleteOfflineSale = async (id) => {
    const db = await initDB()
    return db.delete(STORE_NAME, id)
}
