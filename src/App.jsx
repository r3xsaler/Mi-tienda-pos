import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  getDocs 
} from "firebase/firestore";

// NOTA: Se eliminaron los imports estáticos para mejorar la velocidad inicial.
// Las librerías se cargarán solo cuando se necesiten.

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAxW3KzbHcFx7XhsILXPkl3fagnP8HkzFU",
    authDomain: "r3xsaler-project-v1.firebaseapp.com",
    projectId: "r3xsaler-project-v1",
    storageBucket: "r3xsaler-project-v1.firebasestorage.app",
    messagingSenderId: "959213104686",
    appId: "1:959213104686:web:5e5a33b1a32dd99590f9bf"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "1:959213104686:web:5e5a33b1a32dd99590f9bf";

// --- UTILIDADES ---
const roundToTwo = (num) => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const formatBs = (number) => {
    return new Intl.NumberFormat('es-VE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(number);
};

const formatUSD = (number) => {
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(number);
};

const formatDate = (dateData) => {
    if (!dateData) return "-";
    if (dateData.toDate) return dateData.toDate().toLocaleString();
    return new Date(dateData).toLocaleString();
};

const productCategories = ['Aseo personal', 'Bebidas', 'Charcutería', 'Chucherias', 'Medicinas', 'Otros', 'Papelería', 'Víveres'];
const paymentMethods = ['Biopago', 'Bolívares en Efectivo', 'Dolares en Efectivo', 'Pago móvil', 'Punto de venta', 'Transferencia Bancaria', 'Zelle'];

// --- COMPONENTES VISUALES ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => { onClose(); }, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bgColors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
  return (
    <div className={`fixed bottom-4 right-4 z-[60] ${bgColors[type] || 'bg-gray-800'} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-fade-in-up`}>
      <span>{message}</span>
    </div>
  );
};

const AuthScreen = ({ onLogin, onRegister, errorMessage }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoginView) { onLogin(email, password); } else { onRegister(email, password); }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 mt-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Contraseña</label><input type="password" 
          value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 mt-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
          {errorMessage && <p className="text-red-500 text-sm font-semibold text-center">{errorMessage}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700">{isLoginView ?
          'Iniciar Sesión' : 'Registrar'}</button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => setIsLoginView(!isLoginView)} className="text-sm font-semibold text-blue-600 hover:underline">{isLoginView ?
          '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia Sesión'}</button></div>
      </div>
    </div>
  );
};

const GenericModal = ({ title, message, onClose }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="mb-4 text-gray-700">{message}</p>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Aceptar</button>
      </div>
    </div>
);

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="mb-4 text-gray-700">{message}</p>
        <div className="flex justify-center space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded-xl hover:bg-gray-400">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Aceptar</button>
        </div>
      </div>
    </div>
);

// --- APP PRINCIPAL ---
function App() {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [dailyRate, setDailyRate] = useState(0);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  // Estados para Reportes
  const [dailyClosings, setDailyClosings] = useState([]);
  const [selectedClosing, setSelectedClosing] = useState(null);
  
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState(''); 
  const [activePaymentMethod, setActivePaymentMethod] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [weightProduct, setWeightProduct] = useState(null);
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [genericModalMessage, setGenericModalMessage] = useState('');
  const [genericModalTitle, setGenericModalTitle] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(() => {});
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false); // NUEVO ESTADO PARA EL BOTÓN PDF
  
  // Estados de formulario
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(productCategories[0]);
  const [productType, setProductType] = useState('Unidad');
  const [productCost, setProductCost] = useState('');
  const [productAcquisitionRate, setProductAcquisitionRate] = useState('');
  const [productProfit, setProductProfit] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productStock, setProductStock] = useState('');
  const [hasFixedPrice, setHasFixedPrice] = useState(false);
  const [fixedPriceAmount, setFixedPriceAmount] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryFilterCategory, setInventoryFilterCategory] = useState('');
  const [filterFixedPriceOnly, setFilterFixedPriceOnly] = useState(false); // NUEVO ESTADO FILTRO
  const [filterMethod, setFilterMethod] = useState('');
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState(null);
  const [rateInput, setRateInput] = useState('');

  // Inicialización Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setUserId(currentUser ? currentUser.uid : null);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listeners de datos
  useEffect(() => {
    if (!userId) return;
    
    // Tasa
    const userSettingsDoc = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'dailyRate');
    const unsubscribeRate = onSnapshot(userSettingsDoc, (docSnap) => {
      if (docSnap.exists()) { 
          const val = docSnap.data().value || 0;
          setDailyRate(val);
          setRateInput(val.toString().replace('.', ','));
      } else { 
          setDailyRate(0); 
          setRateInput('0');
      }
    });

    // Inventario
    const productsCollection = collection(db, `artifacts/${appId}/users/${userId}/inventory`);
    const qProducts = query(productsCollection);
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(productList.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    });

    // Ventas (Carrito del día)
    const salesCollection = collection(db, `artifacts/${appId}/users/${userId}/salesHistory`);
    const qSales = query(salesCollection, orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      const salesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesHistory(salesList);
    }, (error) => {
         const simpleQuery = query(salesCollection, limit(100));
         getDocs(simpleQuery).then(snap => {
             const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
             setSalesHistory(list);
          });
    });

    // Cierres de Caja (Reportes)
    const closingsCollection = collection(db, `artifacts/${appId}/users/${userId}/dailyClosings`);
    const qClosings = query(closingsCollection, orderBy('createdAt', 'desc'), limit(30)); 
    const unsubscribeClosings = onSnapshot(qClosings, (snapshot) => {
        const closingList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setDailyClosings(closingList);
    });
    return () => { unsubscribeRate(); unsubscribeProducts(); unsubscribeSales(); unsubscribeClosings(); };
  }, [userId]);

  const handleRateInputChange = (e) => {
      const val = e.target.value;
      if (/^[0-9]*[.,]?[0-9]*$/.test(val)) setRateInput(val);
  };

  const saveDailyRate = async () => {
      let numericVal = parseFloat(rateInput.replace(',', '.'));
      if (isNaN(numericVal)) numericVal = 0;
      if (numericVal > 0) {
          await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'dailyRate'), { value: numericVal });
          showToast('Tasa actualizada', 'success'); 
      } else { 
          showToast('Valor inválido', 'error');
      }
  };

  const filteredProducts = useMemo(() => {
     if (searchTerm.length === 0) return [];
     return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [products, searchTerm]);

  // LOGICA INVENTARIO ACTUALIZADA
  const inventoryList = useMemo(() => {
     return products.filter(product => {
        const searchMatch = inventorySearchTerm === '' || product.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) || (product.code && product.code.toLowerCase().includes(inventorySearchTerm.toLowerCase()));
        const categoryMatch = inventoryFilterCategory === '' || product.category === inventoryFilterCategory;
        const fixedPriceMatch = !filterFixedPriceOnly || product.hasFixedPrice === true; // Nuevo filtro
        
        return searchMatch && categoryMatch && fixedPriceMatch;
    });
  }, [products, inventorySearchTerm, inventoryFilterCategory, filterFixedPriceOnly]);

  const filteredSalesHistory = useMemo(() => {
     return salesHistory.filter(sale => filterMethod === '' || sale.paymentMethod === filterMethod); 
  }, [salesHistory, filterMethod]);

  const showToast = (message, type = 'success') => { setToast({ message, type }); };
  const handleRegister = async (email, password) => { try { await createUserWithEmailAndPassword(auth, email, password); setAuthError(''); showToast('¡Cuenta creada!', 'success');
  } catch (error) { setAuthError(error.message); } };
  const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password);
  setAuthError(''); } catch (error) { setAuthError('Verifica los datos.'); } };
  const handleLogout = async () => { await signOut(auth); setUserId(null);
  setCurrentPage('home'); };

  const calculateSalePrice = (product) => {
    const costInDollars = (product.acquisitionRate > 0) ?
    product.costBs / product.acquisitionRate : 0;
    const currentCostBs = (dailyRate > 0) ? roundToTwo(costInDollars * dailyRate) : 0;
    
    let salePriceBs, salePriceInDollars;
    if (product.hasFixedPrice) {
        salePriceBs = parseFloat(product.fixedPriceAmount) || 0;
        salePriceInDollars = (dailyRate > 0) ? roundToTwo(salePriceBs / dailyRate) : 0;
    } else {
        const profitMargin = product.profitPercentage / 100;
        salePriceInDollars = roundToTwo(costInDollars * (1 + profitMargin));
        salePriceBs = (dailyRate > 0) ? roundToTwo(salePriceInDollars * dailyRate) : 0;
    }

    return { 
        salePriceBs, 
        costInDollars, 
        salePriceInDollars, 
        currentCostBs,
        hasFixedPrice: product.hasFixedPrice || false 
    };
  };

  const handleSearch = (e) => { setSearchTerm(e.target.value); };
  const clearForm = () => {
    setProductName(''); setProductCategory(productCategories[0]); setProductType('Unidad'); setProductCost('');
    setProductAcquisitionRate(''); setProductProfit(''); setProductCode(''); setProductStock(''); 
    setHasFixedPrice(false); setFixedPriceAmount('');
    setEditingProduct(null);
  };

  const handleAddOrUpdateProduct = async () => {
    if (!productName || productCost === '' || productAcquisitionRate === '' || productProfit === '' || (productStock === '' && productType === 'Unidad')) {
      setGenericModalTitle('Error');
      setGenericModalMessage('Rellene todos los campos básicos.'); setShowGenericModal(true); return;
    }
    
    if (hasFixedPrice && (fixedPriceAmount === '' || parseFloat(fixedPriceAmount) <= 0)) {
        setGenericModalTitle('Error');
        setGenericModalMessage('Si activa Precio Fijo, debe ingresar un monto en Bs válido.'); setShowGenericModal(true); return;
    }

    const newProduct = {
      name: productName, category: productCategory, type: productType,
      costBs: parseFloat(productCost) || 0, acquisitionRate: parseFloat(productAcquisitionRate) || 0,
      profitPercentage: parseFloat(productProfit) || 0, code: productCode,
      stock: productType === 'Unidad' ? parseInt(productStock, 10) || 0 : parseFloat(productStock) || 0,
      hasFixedPrice: hasFixedPrice,
      fixedPriceAmount: hasFixedPrice ? parseFloat(fixedPriceAmount) : 0,
      createdAt: serverTimestamp()
    };
    try {
      if (editingProduct) { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, editingProduct.id), newProduct);
      } 
      else { await addDoc(collection(db, `artifacts/${appId}/users/${userId}/inventory`), newProduct); }
      clearForm();
      setShowInventoryModal(false); showToast(editingProduct ? 'Producto actualizado' : 'Producto agregado', 'success');
    } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage('Error al guardar.'); setShowGenericModal(true);
    }
  };

  const startEditingProduct = (product) => {
    setEditingProduct(product); setProductName(product.name); setProductCategory(product.category); setProductType(product.type);
    setProductCost(product.costBs); setProductAcquisitionRate(product.acquisitionRate); setProductProfit(product.profitPercentage);
    setProductCode(product.code || ''); setProductStock(product.stock);
    setHasFixedPrice(product.hasFixedPrice || false);
    setFixedPriceAmount(product.fixedPriceAmount || '');
    setShowInventoryModal(true);
  };
  const handleDeleteProduct = (productId) => {
    setConfirmModalTitle('Confirmar'); setConfirmModalMessage('¿Eliminar producto?');
    setOnConfirmAction(() => async () => {
      try { await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, productId)); showToast('Eliminado', 'info'); } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage('Error al eliminar.'); setShowGenericModal(true); }
    });
    setShowConfirmModal(true);
  };

  const handleAddToCart = (product, quantity) => {
    if (quantity <= 0) return;
    const existingCartItem = cart.find(item => item.id === product.id);
    const { salePriceBs, costInDollars, salePriceInDollars, currentCostBs } = calculateSalePrice(product);
    const profitPerItem = roundToTwo(salePriceBs - currentCostBs);
    const newCartItem = { ...product, quantity, salePriceInBs: salePriceBs, salePriceInDollars: salePriceInDollars, profitPerItem: profitPerItem };
    if (existingCartItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: roundToTwo(item.quantity + quantity) } : item));
    } else { setCart([...cart, newCartItem]); }
    setSearchTerm(''); setShowQuantityModal(false); showToast('Agregado al carrito', 'success');
  };
  const handleCheckout = async () => {
    if (cart.length === 0) { showToast('Carrito vacío', 'error'); return;
    }
    if (!activePaymentMethod) { showToast('Seleccione método de pago', 'error'); return;
    }

    const totalSaleBs = roundToTwo(cart.reduce((sum, item) => sum + item.salePriceInBs * item.quantity, 0));
    const totalProfitBs = roundToTwo(cart.reduce((sum, item) => sum + item.profitPerItem * item.quantity, 0));
    const totalSaleDollars = (dailyRate > 0) ?
    roundToTwo(totalSaleBs / dailyRate) : 0;

    const newSale = {
      items: cart.map(item => ({
        id: item.id, name: item.name, quantity: item.isWeightBased ? item.weightInGrams : item.quantity, 
        salePrice: item.salePriceInBs, profit: item.profitPerItem,
        unitPrice: item.isWeightBased ? item.salePriceInBs : item.salePriceInBs / item.quantity, unit: item.unit || ''
      })),
      totalBs: totalSaleBs, totalDollars: totalSaleDollars, totalProfitBs: totalProfitBs,
      paymentMethod: activePaymentMethod, createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/salesHistory`), newSale);
      const batch = [];
      for (const item of cart) {
        const productDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, item.id);
        const currentStock = parseFloat(item.stock) || 0;
        batch.push(setDoc(productDocRef, { stock: currentStock - item.quantity }, { merge: true }));
      }
      await Promise.all(batch);
      setCart([]); setActivePaymentMethod(''); showToast('Venta exitosa', 'success');
    } catch (e) { setGenericModalTitle('Error');
    setGenericModalMessage('Error en venta.'); setShowGenericModal(true); }
  };
  
  const handleDeleteSale = (saleId) => {
    setConfirmModalTitle('Devolución');
    setConfirmModalMessage('¿Restaurar inventario y borrar venta?');
    setOnConfirmAction(() => async () => {
      try {
        const saleToRestore = salesHistory.find(s => s.id === saleId);
        if (!saleToRestore) throw new Error("No encontrada.");
        const updatePromises = [];
        for (const item of saleToRestore.items) {
          const currentProduct = products.find(p => p.id === item.id);
          if (currentProduct) {
              const restoredStock = parseFloat(currentProduct.stock) + parseFloat(item.quantity);
               updatePromises.push(setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, item.id), { stock: restoredStock }, { merge: true }));
          }
        }
        if (updatePromises.length > 0) await Promise.all(updatePromises);
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/salesHistory`, saleId));
        showToast('Venta anulada', 'info');
      } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage('Error al anular.'); setShowGenericModal(true); }
    });
    setShowConfirmModal(true);
  };

  // --- LÓGICA DE CIERRE DE CAJA ---
  const handleCloseDay = async () => {
    if (salesHistory.length === 0) { showToast('No hay ventas para cerrar', 'info');
    return; }
    
    setConfirmModalTitle('Cierre de Caja');
    setConfirmModalMessage('¿Desea cerrar el día? Se guardará el reporte en la nube y se limpiará el historial.');
    setOnConfirmAction(() => async () => {
        try {
            const totalBsSum = roundToTwo(salesHistory.reduce((acc, sale) => acc + sale.totalBs, 0));
            const totalDollarsSum = roundToTwo(salesHistory.reduce((acc, sale) => acc + sale.totalDollars, 0));
            const totalProfitSum = roundToTwo(salesHistory.reduce((acc, sale) => acc + sale.totalProfitBs, 0));
            
            const closingData = {
                createdAt: serverTimestamp(),
                totalBs: totalBsSum,
                totalDollars: totalDollarsSum,
                totalProfit: totalProfitSum,
                salesCount: salesHistory.length,
                salesData: salesHistory,
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/dailyClosings`), closingData);

            const batchPromises = salesHistory.map(sale => 
                deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/salesHistory`, sale.id))
            );
            await Promise.all(batchPromises);
            showToast('Día cerrado y guardado exitosamente', 'success');
        } catch (e) { 
            setGenericModalTitle('Error');
            setGenericModalMessage(`Error al cerrar caja: ${e.message}`); 
            setShowGenericModal(true); 
        }
    });
    setShowConfirmModal(true);
  };

  // --- REIMPRIMIR PDF CON FEEDBACK VISUAL MEJORADO ---
  const handleReprintPDF = async (closingData) => {
    // 1. ACTIVAR ESTADO DE CARGA (BOTÓN)
    setIsPdfLoading(true);
    try {
        // IMPORTACIÓN DINÁMICA
        const { jsPDF } = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const autoTable = autoTableModule.default;

        const docPdf = new jsPDF();
        const salesToPrint = closingData.salesData;
        const getFormattedDate = (dateVal) => {
            if (!dateVal) return "-";
            if (dateVal.toDate) return dateVal.toDate().toLocaleString();
            if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleString();
            return new Date(dateVal).toLocaleString();
        };

        const reportDate = getFormattedDate(closingData.createdAt);

        docPdf.setFontSize(16);
        docPdf.text(`Historial de Ventas - Cierre: ${reportDate}`, 14, 15);

        const columnsHist = ["Fecha", "Total $", "Total Bs", "Ganancia Bs", "Método de Pago"];
        const dataHist = salesToPrint.map(sale => [
            getFormattedDate(sale.createdAt),
            formatUSD(sale.totalDollars),
            formatBs(sale.totalBs),
            formatBs(sale.totalProfitBs),
            sale.paymentMethod
        ]);
        dataHist.push([
            "TOTALES:",
            formatUSD(closingData.totalDollars),
            formatBs(closingData.totalBs),
            formatBs(closingData.totalProfit),
            ""
        ]);
        autoTable(docPdf, {
            head: [columnsHist],
            body: dataHist,
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] },
        });
        const summaryByMethod = {};
        paymentMethods.forEach(method => {
            summaryByMethod[method] = { totalBs: 0, totalDollars: 0, profitBs: 0 };
        });
        salesToPrint.forEach(sale => {
            const method = sale.paymentMethod;
            if (summaryByMethod[method]) {
                summaryByMethod[method].totalBs += sale.totalBs;
                summaryByMethod[method].totalDollars += sale.totalDollars;
                summaryByMethod[method].profitBs += sale.totalProfitBs;
            }
        });

        const columnsSummary = ["Método de Pago", "Venta Total (Bs)", "Ganancia Total (Bs)", "Venta Total ($)"];
        const dataSummary = Object.keys(summaryByMethod)
            .filter(method => summaryByMethod[method].totalBs > 0)
            .map(method => [
                method,
                formatBs(summaryByMethod[method].totalBs),
                formatBs(summaryByMethod[method].profitBs),
                formatUSD(summaryByMethod[method].totalDollars),
             ]);

        let finalY = docPdf.lastAutoTable.finalY || 20;

        docPdf.setFontSize(14);
        docPdf.text("Resumen por Método de Pago", 14, finalY + 25);

        autoTable(docPdf, {
            head: [columnsSummary],
            body: dataSummary,
            startY: finalY + 30,
            theme: 'grid',
            headStyles: { fillColor: [40, 100, 200] },
        });
        docPdf.save(`Cierre_${reportDate.replace(/\//g,'-').replace(/:/g,'.').replace(/ /g,'_')}.pdf`);
        showToast('PDF Generado', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error generando PDF: ' + e.message, 'error');
    } finally {
        // 2. APAGAR ESTADO DE CARGA (BOTÓN)
        setIsPdfLoading(false);
    }
  };

  const handleDeleteClosing = (closingId) => {
      setConfirmModalTitle('Eliminar Reporte');
      setConfirmModalMessage('¿Borrar este cierre permanentemente? Esta acción libera espacio pero no se puede deshacer.');
      setOnConfirmAction(() => async () => {
          try {
              await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/dailyClosings`, closingId));
              setShowClosingModal(false);
              showToast('Reporte eliminado', 'info');
          } catch(e) {
              showToast('Error al eliminar', 'error');
          }
      });
      setShowConfirmModal(true);
  };

  const handleCalculateWeight = () => {
    if (!weightValue || isNaN(weightValue) || parseFloat(weightValue) <= 0) { showToast('Peso inválido', 'error');
    return; }
    const { salePriceBs, costInDollars, salePriceInDollars, currentCostBs } = calculateSalePrice(weightProduct);
    const weightInKg = parseFloat(weightValue) / 1000;
    const finalPriceBs = roundToTwo(salePriceBs * weightInKg);
    const finalCostBs = roundToTwo(currentCostBs * weightInKg);
    const profitPerSale = roundToTwo(finalPriceBs - finalCostBs);
    const itemToAdd = {
      ...weightProduct, quantity: 1, weightInGrams: parseFloat(weightValue), 
      salePriceInBs: finalPriceBs, salePriceInDollars: roundToTwo(salePriceInDollars * weightInKg),
      profitPerItem: profitPerSale, isWeightBased: true, unit: 'g'
    };
    setCart([...cart, itemToAdd]); setShowWeightModal(false); setWeightValue(''); setSearchTerm(''); showToast('Agregado', 'success');
  };
  
  const handleShareCart = async () => {
    const summaryElement = document.getElementById('cart-summary-capture');
    if (!summaryElement) return;
    
    showToast('Procesando imagen...', 'info');
    
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const totalBsShare = roundToTwo(cart.reduce((sum, item) => sum + item.salePriceInBs * item.quantity, 0));
      const shareText = `Total: Bs. ${formatBs(totalBsShare)}`;
      
      try { await navigator.clipboard.writeText(shareText);
      } catch (e) {}
      
      const canvas = await html2canvas(summaryElement, { scale: 2, backgroundColor: "#F3F4F6" });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "resumen.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Resumen', text: shareText }); } catch (err) {}
        } else {
          const link = document.createElement('a'); link.download = 'resumen.png'; link.href = canvas.toDataURL(); link.click();
          showToast('Imagen descargada', 'success');
        }
      }, 'image/png');
    } catch (error) { showToast('Error generando imagen', 'error'); }
  };

  const totalGlobalProfit = roundToTwo(salesHistory.reduce((sum, sale) => sum + sale.totalProfitBs, 0));
  const calculateSuggestedPrice = () => {
      const pCost = parseFloat(productCost) || 0;
      const pRate = parseFloat(productAcquisitionRate) || 0;
      const pProfit = parseFloat(productProfit) || 0;
      
      const costInDollars = (pRate > 0) ?
      pCost / pRate : 0;
      const suggestedInDollars = roundToTwo(costInDollars * (1 + (pProfit/100)));
      const suggestedBs = (dailyRate > 0) ?
      suggestedInDollars * dailyRate : 0;
      return formatBs(suggestedBs);
  };

  const renderPage = () => {
    if (isLoading) { return <div className="flex justify-center h-screen items-center text-gray-500 font-bold animate-pulse">Cargando sistema...</div>;
    }
    if (!userId) { return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} errorMessage={authError}/>;
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              {/* HEADER CON TÍTULO Y BOTÓN SALIR */}
              <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <h2 className="text-3xl font-bold text-gray-800">Inicio</h2>
                  <button onClick={handleLogout} className="flex items-center space-x-2 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                      {/* Icono de Salir SVG Inline */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      <span className="font-bold text-sm">Cerrar Sesión</span>
                  </button>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-gray-700">Tasa del Día</h3>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="relative w-full md:w-1/2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input type="text" inputMode="decimal" className="w-full px-10 py-3 bg-gray-100 rounded-xl text-lg font-bold text-center text-gray-700 
                  focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tasa en Bs. (ej: 60,50)" value={rateInput} onChange={handleRateInputChange} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Bs</span>
                </div>
                <button onClick={saveDailyRate} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700">Actualizar</button>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Productos</h3>
                <button onClick={() => { clearForm(); setShowInventoryModal(true); }} className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700">Nuevo Producto</button>
              </div>
              
              {/* UI FILTROS ACTUALIZADA */}
              <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                  <input type="text" placeholder="Buscar..." className="w-full md:w-5/12 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} />
                  
                  <select className="w-full md:w-4/12 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" value={inventoryFilterCategory} onChange={(e) => setInventoryFilterCategory(e.target.value)}>
                      <option value="">Todas</option>
                      {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  <label className="w-full md:w-3/12 flex items-center justify-center md:justify-start space-x-3 cursor-pointer bg-gray-50 px-4 py-2 border rounded-xl hover:bg-gray-100 transition-colors">
                      <input 
                          type="checkbox" 
                          checked={filterFixedPriceOnly} 
                          onChange={(e) => setFilterFixedPriceOnly(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-700 font-medium select-none">Solo Precio Fijo</span>
                  </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-100">
                      <tr><th className="w-16 px-2 py-2 text-center text-xs font-bold text-gray-700 
                      uppercase">Stock</th><th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th><th className="w-24 px-2 py-2 text-right text-xs font-bold text-gray-700 uppercase">Precio $</th><th className="w-32 px-2 py-2 text-right text-xs font-bold text-gray-700 uppercase">Precio Bs.</th><th className="w-20 px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase">Acción</th></tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryList.map(product => {
                       const { salePriceBs, salePriceInDollars, hasFixedPrice } = calculateSalePrice(product);
                       return (
                                <tr key={product.id} className="bg-white hover:bg-gray-50">
                                    <td className={`px-2 py-2 text-sm font-bold text-center ${parseFloat(product.stock) < 5 ? 'text-red-600 bg-red-100' : 'text-gray-800'}`}>
                                         {product.type === 'Peso' ? product.stock.toFixed(3) : product.stock}
                                    </td>
                                    <td className="px-2 py-2 text-sm font-medium text-gray-900 break-words">{product.name}</td>
                                    <td className="px-2 py-2 text-sm font-semibold text-right text-gray-700">
                                        {hasFixedPrice ? '-' : formatUSD(salePriceInDollars)}
                                    </td>
                                    <td className={`px-2 py-2 text-sm font-semibold text-right ${hasFixedPrice ? 'text-blue-700 bg-blue-50' : 'text-gray-700'}`}>
                                         {formatBs(salePriceBs)}
                                    </td>
                                    <td className="px-2 py-2 text-right text-sm font-medium">
                                        <div className="flex justify-center items-center space-x-1">
                                            <button onClick={() => startEditingProduct(product)} className="text-indigo-600 hover:text-indigo-900 p-1">Edit</button>
                                            <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 p-1">Del</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                    })
                    }
                  </tbody>
                </table>
              </div>
            </div>
            {showInventoryModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                   <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl">
                      <h2 className="text-2xl font-bold text-gray-800">{editingProduct ? 'Editar' : 'Nuevo'}</h2>
                      <button onClick={() => setShowInventoryModal(false)} className="text-gray-500 hover:text-gray-700">X</button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-grow">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         <div><label className="block text-gray-700 font-semibold mb-2">Nombre</label><input type="text" className="w-full px-4 py-2 border rounded-xl" value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Categoría</label><select className="w-full px-4 py-2 border rounded-xl" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>{productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                        <div><label className="block text-gray-700 
                        font-semibold mb-2">Código</label><input type="text" className="w-full px-4 py-2 border rounded-xl" value={productCode} onChange={(e) => setProductCode(e.target.value)} /></div>
                        
                        <div className="md:col-span-1"><label className="block text-gray-700 font-semibold mb-2">Tipo</label><div className="flex items-center space-x-4"><label className="inline-flex items-center"><input type="radio" name="productType" value="Unidad" checked={productType === 'Unidad'} onChange={() => setProductType('Unidad')} /><span className="ml-2">Unidad</span></label><label className="inline-flex items-center"><input type="radio" name="productType" value="Por Kilo/Gramo" checked={productType === 'Por Kilo/Gramo'} onChange={() => setProductType('Por Kilo/Gramo')} /><span className="ml-2">Peso</span></label></div></div>
                        
                        <div><label className="block text-gray-700 font-semibold mb-2">Costo (Bs)</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productCost === 0 ?
                        '' : productCost} onChange={(e) => setProductCost(e.target.value)} /></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Tasa Adq.</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productAcquisitionRate === 0 ?
                        '' : productAcquisitionRate} onChange={(e) => setProductAcquisitionRate(e.target.value)} /></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Ganancia (%)</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productProfit === 0 ?
                        '' : productProfit} onChange={(e) => setProductProfit(e.target.value)} /></div>
                        
                        {productType === 'Unidad' && (<div><label className="block text-gray-700 font-semibold mb-2">Stock</label><input type="number" inputMode="numeric" className="w-full px-4 py-2 border rounded-xl" value={productStock === 0 ? '' : productStock} onChange={(e) => setProductStock(e.target.value)} /></div>)}

                        <div className="md:col-span-3 border-t pt-4 mt-2">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={hasFixedPrice} onChange={(e) => setHasFixedPrice(e.target.checked)} />
                                <span className="text-gray-800 font-bold text-lg">¿Precio Fijo en Bolívares?</span>
                            </label>
                            
                            {hasFixedPrice && (
                                <div className="mt-4 flex flex-col md:flex-row items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="w-full md:w-1/2">
                                        <label className="block text-blue-800 font-semibold mb-2">Precio Fijo (Bs)</label>
                                        <input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border border-blue-300 rounded-xl focus:ring-blue-500" placeholder="Ej: 150.00" value={fixedPriceAmount} onChange={(e) => setFixedPriceAmount(e.target.value)} />
                                    </div>
                                    <div className="w-full md:w-1/2 text-sm text-blue-700">
                                        <p className="font-bold">Referencia Sugerida:</p>
                                        <p>Según costo y ganancia actual: <span className="font-bold text-lg">Bs.
                                        {calculateSuggestedPrice()}</span></p>
                                        <p className="mt-1 text-xs opacity-75">*Este precio no cambiará con la tasa del día.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>
                    </div>
                   <div className="p-4 border-t border-gray-100 flex flex-col-reverse md:flex-row justify-end gap-3 bg-white rounded-b-2xl">
                        <button onClick={() => setShowInventoryModal(false)} className="w-full md:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl">Cancelar</button>
                        <button onClick={handleAddOrUpdateProduct} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-xl">{editingProduct ?
                        'Actualizar' : 'Guardar'}</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'cart':
        const totalBs = roundToTwo(cart.reduce((sum, item) => sum + item.salePriceInBs * item.quantity, 0));
        const totalDollars = (dailyRate > 0) ? roundToTwo(totalBs / dailyRate) : 0;
        return (
          <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Carrito de Ventas</h2>
              <div className="relative mb-6">
                <input type="text" className="w-full px-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar producto..." value={searchTerm} onChange={handleSearch} />
                {filteredProducts.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => {
                       const priceInfo = calculateSalePrice(product);
                       return (
                          <li key={product.id} className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => { if (product.type === 'Por Kilo/Gramo') { setWeightProduct(product);
                          setShowWeightModal(true); } else { setProductToAdd(product); setQuantityToAdd(''); setShowQuantityModal(true); } }}>
                            <div>
                                <span className="font-bold text-gray-800">{product.name}</span>
                                <span className="text-sm text-gray-500 block">Stock: {product.stock} {product.hasFixedPrice && <span className="text-blue-600 font-bold ml-2">(Fijo)</span>}</span>
                            </div>
                            <span className="text-sm text-gray-600">Bs.
                            {formatBs(priceInfo.salePriceBs)}</span>
                          </li>
                       );
                    })}
                  </ul>
                )}
              </div>
              
              <div id="cart-summary-capture" className="bg-gray-50 rounded-xl border border-gray-200 mb-6 overflow-hidden">
                <div 
                className="flex justify-between items-center p-2.5 border-b border-gray-300">
                   <h3 className="text-xl font-bold text-gray-800">Resumen</h3>
                   <button onClick={handleShareCart} className="text-green-600 hover:text-green-700 text-sm font-semibold">Compartir</button>
                </div>
                <div className="bg-gray-100">
                  {cart.map((item, index) => {
                      const lineTotal = item.isWeightBased ? item.salePriceInBs : (item.salePriceInBs * item.quantity);
                      const displayUnit = item.isWeightBased ? `${item.weightInGrams}g` : `${item.quantity} x Bs. ${formatBs(item.salePriceInBs)}`;
                      return (
                           <div key={index} className="flex justify-between items-center p-4 border-b border-gray-200 last:border-b-0">
                            <div className="flex-grow min-w-0 pr-4">
                               <p className="font-semibold text-gray-700 whitespace-normal">{item.name} {item.hasFixedPrice && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Fijo</span>}</p>
                               <p className="text-sm text-gray-500">{displayUnit}</p>
                            </div>
                            <div className="flex items-center space-x-4 flex-shrink-0">
                                <p className="font-bold text-gray-900 whitespace-nowrap text-lg">Bs.
                                {formatBs(lineTotal)}</p>
                                <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 font-bold text-xl px-2">X</button>
                            </div>
                          </div>
                      );
                  })}
                </div>
                <div className="p-2.5 bg-gray-50 border-t-2 border-gray-300 flex justify-between items-center">
                  <span className="font-bold text-xl text-gray-800">Total:</span>
                  <div className="text-right">
                      <span className="text-gray-900 font-bold text-xl block">Bs. {formatBs(totalBs)}</span>
                      <span className="text-sm text-gray-500 font-medium">({formatUSD(totalDollars)}$)</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2 text-gray-800">Método de Pago</h3>
                <div className="relative">
                  <select value={activePaymentMethod} onChange={(e) => setActivePaymentMethod(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-lg">
                    <option value="">--Seleccionar--</option>
                    {paymentMethods.map(method => (<option key={method} value={method}>{method}</option>))}
                  </select>
                </div>
              </div>
              
              <button onClick={handleCheckout} disabled={cart.length === 0 || !activePaymentMethod} className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-200 ${(cart.length > 0 && activePaymentMethod) ?
              'bg-green-600 text-white shadow-lg hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                {!activePaymentMethod && cart.length > 0 ?
                'Seleccione Método de Pago' : 'Finalizar Venta'}
              </button>
            </div>
            
            {showQuantityModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
                <div className="bg-white p-6 
                rounded-2xl shadow-xl w-80">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Cantidad</h3>
                  <input type="number" inputMode="numeric" value={quantityToAdd} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && quantityToAdd > 0) handleAddToCart(productToAdd, parseInt(quantityToAdd)); }} onChange={(e) => setQuantityToAdd(e.target.value)} className="w-full px-4 py-2 border rounded-xl mb-4" />
                  <div className="flex justify-end space-x-4">
                    <button onClick={() => setShowQuantityModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded-xl">Cancelar</button>
                    <button onClick={() => handleAddToCart(productToAdd, parseInt(quantityToAdd))} disabled={!quantityToAdd ||
                    parseInt(quantityToAdd) <= 0} className={`px-4 py-2 text-white font-bold rounded-xl ${(!quantityToAdd || parseInt(quantityToAdd) <= 0) ?
                    'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'}`}>Añadir</button>
                  </div>
                </div>
              </div>
            )}
            
            {showWeightModal && (
               <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
                <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Peso (gramos)</h3>
                  <input type="number" inputMode="decimal" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className="w-full px-4 py-2 border rounded-xl mb-4" />
                  <div className="flex justify-end space-x-4">
                    <button onClick={() => setShowWeightModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded-xl">Cancelar</button>
                    <button onClick={handleCalculateWeight} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl">Añadir</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'history':
        return (
          <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Historial (Últimas 50)</h2>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-gray-800">Ganancia Global:</span>
                  <span className="text-xl text-green-600 font-extrabold">{formatBs(totalGlobalProfit)}</span>
                </div>
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
                  <select className="px-4 py-2 border rounded-xl" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                    <option value="">Todos los métodos</option>
                    {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                  </select>
                  {/* BOTÓN CERRAR CAJA / GUARDAR */}
                  <button onClick={() => handleCloseDay()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Cerrar Caja (Guardar)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left"></th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Método</th><th className="px-4 py-3 text-left">Total Bs</th><th className="px-4 py-3 text-left">Acción</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSalesHistory.length === 0 ?
                    (<tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No hay ventas recientes.</td></tr>) : (
                      filteredSalesHistory.map(sale => (
                        <React.Fragment key={sale.id}>
                          <tr className={`hover:bg-gray-50 ${expandedSaleId === sale.id ? 'bg-blue-50' : ''}`}>
                             <td className="px-4 py-4"><button onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)} className="text-gray-500 font-bold">{expandedSaleId === sale.id ? '▼' : '▶'}</button></td>
                            <td className="px-4 py-4 text-sm font-medium">{formatDate(sale.createdAt)}</td>
                            <td className="px-4 py-4 text-sm text-gray-500">{sale.paymentMethod}</td>
                            <td className="px-4 py-4 text-sm font-bold">Bs. {formatBs(sale.totalBs)}</td>
                            <td className="px-4 py-4 text-sm"><button onClick={() => handleDeleteSale(sale.id)} className="text-red-500 hover:text-red-700 font-bold">X</button></td>
                          </tr>
                          {expandedSaleId === sale.id && (<tr className="bg-gray-50"><td colSpan="5" className="px-4 py-4"><div className="pl-10"><table className="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr className="bg-gray-200"><th className="px-4 py-2 text-xs">Cant</th><th className="px-4 py-2 text-xs">Prod</th><th className="px-4 py-2 text-xs text-right">Bs</th></tr></thead><tbody>{sale.items.map((item, idx) => (<tr key={idx}><td className="px-4 py-2 text-sm">{item.quantity}</td><td className="px-4 py-2 text-sm">{item.name}</td><td className="px-4 py-2 text-sm text-right">{formatBs(item.salePrice)}</td></tr>))}</tbody></table></div></td></tr>)}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'reports':
          return (
            <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Reportes de Cierre</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Cierre</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ventas</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Bs</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total $</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {dailyClosings.length === 0 ?
                            (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No hay reportes guardados.</td></tr>
                            ) : (
                              
                                dailyClosings.map(closing => (
                                    <tr key={closing.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedClosing(closing); setShowClosingModal(true); }}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(closing.createdAt)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{closing.salesCount} ventas</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">Bs. {formatBs(closing.totalBs)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">$ {formatUSD(closing.totalDollars)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-blue-600">Ver Detalles</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
              
              {/* MODAL DETALLE REPORTE - MODIFICADO */}
              {showClosingModal && selectedClosing && (
                  <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                             {/* Fecha movida al encabezado */}
                            <h3 className="text-xl font-bold text-gray-800">
                                Detalle Cierre - <span className="text-base font-medium ml-2">{formatDate(selectedClosing.createdAt)}</span>
                            </h3>
                            <button onClick={() => setShowClosingModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Caja de Ganancia Total (Reemplaza a Fecha) */}
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                    <p className="text-xs text-yellow-600 uppercase">Ganancia Total</p>
                                    <p className="font-bold text-yellow-800 text-lg">Bs.
                                    {formatBs(selectedClosing.totalProfit)}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-xs text-blue-500 uppercase">Total Ventas</p>
                                    <p className="font-semibold text-blue-800">{selectedClosing.salesCount}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-xs text-green-600 uppercase">Total Bs</p>
                                    <p className="font-bold text-green-800 text-lg">Bs.
                                    {formatBs(selectedClosing.totalBs)}</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-lg">
                                    <p className="text-xs text-indigo-600 uppercase">Total $</p>
                                    <p className="font-bold text-indigo-800 text-lg">$ {formatUSD(selectedClosing.totalDollars)}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t flex flex-col gap-3">
                                {/* BOTÓN PDF CON FEEDBACK VISUAL */}
                                <button 
                                    onClick={() => handleReprintPDF(selectedClosing)} 
                                    disabled={isPdfLoading}
                                    className={`w-full py-3 text-white font-bold rounded-xl shadow flex justify-center items-center gap-2 transition-all ${isPdfLoading ?
                                    'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {isPdfLoading ?
                                    (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 
                                                12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generando PDF...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline 
                                            points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                            Descargar PDF
                                        </>
                                    )}
                                </button>
                                <button onClick={() => handleDeleteClosing(selectedClosing.id)} className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 flex justify-center items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" 
                                    x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    Eliminar Registro Definitivamente
                                </button>
                            </div>
                        </div>
                    </div>
                  </div>
              )}
            </div>
          );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-16">
      <div className="max-w-7xl mx-auto">{renderPage()}</div>
      {userId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-md">
          <nav className="flex justify-around items-center h-16">
            {['home', 'inventory', 'cart', 'history', 'reports'].map(page => (
                <button 
                key={page} onClick={() => setCurrentPage(page)} className={`flex-1 flex flex-col items-center justify-center h-full text-xs md:text-sm font-semibold ${currentPage === page ? 'text-blue-600' : 'text-gray-600'}`}>
                    {/* Iconos Simples SVG Inline para no usar Lucide */}
                    <div className="mb-1">
                        {page === 'home' && <svg xmlns="http://www.w3.org/2000/svg" width="20" 
                        height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                        {page === 'inventory' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 
                        2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                        {page === 'cart' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>}
                        {page === 'history' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        {page === 'reports' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline 
                        points="10 9 9 9 8 9"/></svg>}
                    </div>
                    <span className="capitalize">{page === 'home' ?
                    'Inicio' : page === 'history' ? 'Historial' : page === 'inventory' ? 'Inventario' : page === 'cart' ?
                    'Carrito' : 'Reportes'}</span>
                </button>
            ))}
          </nav>
        </div>
      )}
      {showGenericModal && <GenericModal title={genericModalTitle} message={genericModalMessage} onClose={() => setShowGenericModal(false)} />}
      {showConfirmModal && <ConfirmModal title={confirmModalTitle} message={confirmModalMessage} onConfirm={() => { onConfirmAction();
      setShowConfirmModal(false); }} onCancel={() => setShowConfirmModal(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;