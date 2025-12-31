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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- CONFIGURACIÓN FIREBASE (Tus credenciales originales) ---
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

// --- UTILIDADES (Idénticas a tu HTML) ---
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
    const timer = setTimeout(() => { onClose(); }, 1500);
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
          <div><label className="block text-sm font-medium text-gray-700">Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 mt-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
          {errorMessage && <p className="text-red-500 text-sm font-semibold text-center">{errorMessage}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700">{isLoginView ? 'Iniciar Sesión' : 'Registrar'}</button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => setIsLoginView(!isLoginView)} className="text-sm font-semibold text-blue-600 hover:underline">{isLoginView ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia Sesión'}</button></div>
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
  
  // Estados de formulario
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(productCategories[0]);
  const [productType, setProductType] = useState('Unidad');
  const [productCost, setProductCost] = useState('');
  const [productAcquisitionRate, setProductAcquisitionRate] = useState('');
  const [productProfit, setProductProfit] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productStock, setProductStock] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryFilterCategory, setInventoryFilterCategory] = useState('');
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

    // Ventas
    const salesCollection = collection(db, `artifacts/${appId}/users/${userId}/salesHistory`);
    const qSales = query(salesCollection, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      const salesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesHistory(salesList);
    }, (error) => {
         // Fallback por si acaso falla el ordenamiento inicial
         const simpleQuery = query(salesCollection, limit(50));
         getDocs(simpleQuery).then(snap => {
             const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
             setSalesHistory(list);
         });
    });

    return () => { unsubscribeRate(); unsubscribeProducts(); unsubscribeSales(); };
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

  const inventoryList = useMemo(() => {
     return products.filter(product => {
        const searchMatch = inventorySearchTerm === '' || product.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) || (product.code && product.code.toLowerCase().includes(inventorySearchTerm.toLowerCase()));
        const categoryMatch = inventoryFilterCategory === '' || product.category === inventoryFilterCategory;
        return searchMatch && categoryMatch;
    });
  }, [products, inventorySearchTerm, inventoryFilterCategory]);

  const filteredSalesHistory = useMemo(() => {
     return salesHistory.filter(sale => filterMethod === '' || sale.paymentMethod === filterMethod); 
  }, [salesHistory, filterMethod]);

  const showToast = (message, type = 'success') => { setToast({ message, type }); };
  const handleRegister = async (email, password) => { try { await createUserWithEmailAndPassword(auth, email, password); setAuthError(''); showToast('¡Cuenta creada!', 'success'); } catch (error) { setAuthError(error.message); } };
  const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); setAuthError(''); } catch (error) { setAuthError('Verifica los datos.'); } };
  const handleLogout = async () => { await signOut(auth); setUserId(null); setCurrentPage('home'); };

  const calculateSalePrice = (product) => {
    const costInDollars = (product.acquisitionRate > 0) ? product.costBs / product.acquisitionRate : 0;
    const profitMargin = product.profitPercentage / 100;
    const salePriceInDollars = roundToTwo(costInDollars * (1 + profitMargin));
    const salePriceBs = (dailyRate > 0) ? roundToTwo(salePriceInDollars * dailyRate) : 0;
    const currentCostBs = (dailyRate > 0) ? roundToTwo(costInDollars * dailyRate) : 0;
    return { salePriceBs, costInDollars, salePriceInDollars, currentCostBs };
  };

  const handleSearch = (e) => { setSearchTerm(e.target.value); };
  const clearForm = () => {
    setProductName(''); setProductCategory(productCategories[0]); setProductType('Unidad'); setProductCost('');
    setProductAcquisitionRate(''); setProductProfit(''); setProductCode(''); setProductStock(''); setEditingProduct(null);
  };

  const handleAddOrUpdateProduct = async () => {
    if (!productName || productCost === '' || productAcquisitionRate === '' || productProfit === '' || (productStock === '' && productType === 'Unidad')) {
      setGenericModalTitle('Error'); setGenericModalMessage('Rellene todos los campos.'); setShowGenericModal(true); return;
    }
    const newProduct = {
      name: productName, category: productCategory, type: productType,
      costBs: parseFloat(productCost) || 0, acquisitionRate: parseFloat(productAcquisitionRate) || 0,
      profitPercentage: parseFloat(productProfit) || 0, code: productCode,
      stock: productType === 'Unidad' ? parseInt(productStock, 10) || 0 : parseFloat(productStock) || 0,
      createdAt: serverTimestamp()
    };
    try {
      if (editingProduct) { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, editingProduct.id), newProduct); } 
      else { await addDoc(collection(db, `artifacts/${appId}/users/${userId}/inventory`), newProduct); }
      clearForm(); setShowInventoryModal(false); showToast(editingProduct ? 'Producto actualizado' : 'Producto agregado', 'success');
    } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage('Error al guardar.'); setShowGenericModal(true); }
  };

  const startEditingProduct = (product) => {
    setEditingProduct(product); setProductName(product.name); setProductCategory(product.category); setProductType(product.type);
    setProductCost(product.costBs); setProductAcquisitionRate(product.acquisitionRate); setProductProfit(product.profitPercentage);
    setProductCode(product.code || ''); setProductStock(product.stock); setShowInventoryModal(true);
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
    if (cart.length === 0) { showToast('Carrito vacío', 'error'); return; }
    if (!activePaymentMethod) { showToast('Seleccione método de pago', 'error'); return; }

    const totalSaleBs = roundToTwo(cart.reduce((sum, item) => sum + item.salePriceInBs * item.quantity, 0));
    const totalProfitBs = roundToTwo(cart.reduce((sum, item) => sum + item.profitPerItem * item.quantity, 0));
    const totalSaleDollars = (dailyRate > 0) ? roundToTwo(totalSaleBs / dailyRate) : 0;

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
    } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage('Error en venta.'); setShowGenericModal(true); }
  };
  
  const handleDeleteSale = (saleId) => {
    setConfirmModalTitle('Devolución'); setConfirmModalMessage('¿Restaurar inventario y borrar venta?');
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

  // ESTA ES LA FUNCIÓN DEL HTML ORIGINAL QUE FALTABA Y QUE CAUSABA EL ERROR
  const handleDownloadAndResetHistory = async () => {
    if (salesHistory.length === 0) { showToast('No hay ventas', 'info'); return; }
    
    // MEJORA: Solo descarga, NO borra el historial para mayor seguridad
    setConfirmModalTitle('Reporte de Ventas');
    setConfirmModalMessage('¿Descargar reporte en PDF? (Tus datos NO serán borrados)');
    
    setOnConfirmAction(() => async () => {
        try {
            const docPdf = new jsPDF();
            const salesToPrint = filteredSalesHistory.length > 0 ? filteredSalesHistory : salesHistory;
            const columns = ["Fecha", "Total Bs", "Total $", "Ganancia", "Método"];
            const data = salesToPrint.map(sale => [
                formatDate(sale.createdAt), formatBs(sale.totalBs), formatUSD(sale.totalDollars),
                formatBs(sale.totalProfitBs), sale.paymentMethod
            ]);
            
            const totalBsSum = salesToPrint.reduce((acc, sale) => acc + sale.totalBs, 0);
            const totalDollarsSum = salesToPrint.reduce((acc, sale) => acc + sale.totalDollars, 0);
            const totalProfitSum = salesToPrint.reduce((acc, sale) => acc + sale.totalProfitBs, 0);
            data.push(["TOTALES:", formatBs(totalBsSum), formatUSD(totalDollarsSum), formatBs(totalProfitSum), ""]);

            docPdf.text("Reporte de Ventas", 14, 15);
            docPdf.autoTable({ head: [columns], body: data, startY: 20 });
            docPdf.save(`Reporte_Ventas_${new Date().toLocaleDateString().replace(/\//g,'-')}.pdf`);
    
            showToast('PDF Descargado', 'success');
        } catch (e) { setGenericModalTitle('Error'); setGenericModalMessage(`Error: ${e.message}.`); setShowGenericModal(true); }
    });
    setShowConfirmModal(true);
  };

  const handleCalculateWeight = () => {
    if (!weightValue || isNaN(weightValue) || parseFloat(weightValue) <= 0) { showToast('Peso inválido', 'error'); return; }
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
    const totalBsShare = roundToTwo(cart.reduce((sum, item) => sum + item.salePriceInBs * item.quantity, 0));
    const shareText = `Total: Bs. ${formatBs(totalBsShare)}`;
    showToast('Procesando imagen...', 'info');
    try {
      try { await navigator.clipboard.writeText(shareText); } catch (e) {}
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

  const renderPage = () => {
    if (isLoading) { return <div className="flex justify-center h-screen items-center text-gray-500 font-bold animate-pulse">Cargando sistema...</div>; }
    if (!userId) { return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} errorMessage={authError}/>; }

    switch (currentPage) {
      case 'home':
        return (
          <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Tasa del Día</h2>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="relative w-full md:w-1/2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input type="text" inputMode="decimal" className="w-full px-10 py-3 bg-gray-100 rounded-xl text-lg font-bold text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tasa en Bs. (ej: 60,50)" value={rateInput} onChange={handleRateInputChange} />
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
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <input type="text" placeholder="Buscar..." className="w-full md:w-2/3 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} />
                  <select className="w-full md:w-1/3 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" value={inventoryFilterCategory} onChange={(e) => setInventoryFilterCategory(e.target.value)}>
                      <option value="">Todas</option>
                      {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-100">
                      <tr><th className="w-16 px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase">Stock</th><th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th><th className="w-24 px-2 py-2 text-right text-xs font-bold text-gray-700 uppercase">Precio $</th><th className="w-32 px-2 py-2 text-right text-xs font-bold text-gray-700 uppercase">Precio Bs.</th><th className="w-20 px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase">Acción</th></tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryList.map(product => {
                            const { salePriceBs, salePriceInDollars } = calculateSalePrice(product);
                            return (
                                <tr key={product.id} className="bg-white hover:bg-gray-50">
                                    <td className={`px-2 py-2 text-sm font-bold text-center ${parseFloat(product.stock) < 5 ? 'text-red-600 bg-red-100' : 'text-gray-800'}`}>
                                        {product.type === 'Peso' ? product.stock.toFixed(3) : product.stock}
                                    </td>
                                    <td className="px-2 py-2 text-sm font-medium text-gray-900 break-words">{product.name}</td>
                                    <td className="px-2 py-2 text-sm font-semibold text-right text-gray-700">{formatUSD(salePriceInDollars)}</td>
                                    <td className="px-2 py-2 text-sm font-semibold text-right text-gray-700">{formatBs(salePriceBs)}</td>
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
                        <div><label className="block text-gray-700 font-semibold mb-2">Código</label><input type="text" className="w-full px-4 py-2 border rounded-xl" value={productCode} onChange={(e) => setProductCode(e.target.value)} /></div>
                        <div className="md:col-span-1"><label className="block text-gray-700 font-semibold mb-2">Tipo</label><div className="flex items-center space-x-4"><label className="inline-flex items-center"><input type="radio" name="productType" value="Unidad" checked={productType === 'Unidad'} onChange={() => setProductType('Unidad')} /><span className="ml-2">Unidad</span></label><label className="inline-flex items-center"><input type="radio" name="productType" value="Por Kilo/Gramo" checked={productType === 'Por Kilo/Gramo'} onChange={() => setProductType('Por Kilo/Gramo')} /><span className="ml-2">Peso</span></label></div></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Costo (Bs)</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productCost === 0 ? '' : productCost} onChange={(e) => setProductCost(e.target.value)} /></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Tasa Adq.</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productAcquisitionRate === 0 ? '' : productAcquisitionRate} onChange={(e) => setProductAcquisitionRate(e.target.value)} /></div>
                        <div><label className="block text-gray-700 font-semibold mb-2">Ganancia (%)</label><input type="number" step="0.01" inputMode="decimal" className="w-full px-4 py-2 border rounded-xl" value={productProfit === 0 ? '' : productProfit} onChange={(e) => setProductProfit(e.target.value)} /></div>
                        {productType === 'Unidad' && (<div><label className="block text-gray-700 font-semibold mb-2">Stock</label><input type="number" inputMode="numeric" className="w-full px-4 py-2 border rounded-xl" value={productStock === 0 ? '' : productStock} onChange={(e) => setProductStock(e.target.value)} /></div>)}
                      </div>
                   </div>
                   <div className="p-4 border-t border-gray-100 flex flex-col-reverse md:flex-row justify-end gap-3 bg-white rounded-b-2xl">
                        <button onClick={() => setShowInventoryModal(false)} className="w-full md:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl">Cancelar</button>
                        <button onClick={handleAddOrUpdateProduct} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-xl">{editingProduct ? 'Actualizar' : 'Guardar'}</button>
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
                    {filteredProducts.map(product => (
                      <li key={product.id} className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => { if (product.type === 'Por Kilo/Gramo') { setWeightProduct(product); setShowWeightModal(true); } else { setProductToAdd(product); setQuantityToAdd(''); setShowQuantityModal(true); } }}>
                        <div><span className="font-bold text-gray-800">{product.name}</span><span className="text-sm text-gray-500 block">Stock: {product.stock}</span></div>
                        <span className="text-sm text-gray-600">Bs. {formatBs(calculateSalePrice(product).salePriceBs)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div id="cart-summary-capture" className="bg-gray-50 rounded-xl border border-gray-200 mb-6 overflow-hidden">
                <div className="flex justify-between items-center p-2.5 border-b border-gray-300">
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
                               <p className="font-semibold text-gray-700 whitespace-normal">{item.name}</p>
                               <p className="text-sm text-gray-500">{displayUnit}</p>
                            </div>
                            <div className="flex items-center space-x-4 flex-shrink-0">
                                <p className="font-bold text-gray-900 whitespace-nowrap text-lg">Bs. {formatBs(lineTotal)}</p>
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
              
              <button onClick={handleCheckout} disabled={cart.length === 0 || !activePaymentMethod} className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-200 ${(cart.length > 0 && activePaymentMethod) ? 'bg-green-600 text-white shadow-lg hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                {!activePaymentMethod && cart.length > 0 ? 'Seleccione Método de Pago' : 'Finalizar Venta'}
              </button>
            </div>
            
            {showQuantityModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
                <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Cantidad</h3>
                  <input type="number" inputMode="numeric" value={quantityToAdd} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && quantityToAdd > 0) handleAddToCart(productToAdd, parseInt(quantityToAdd)); }} onChange={(e) => setQuantityToAdd(e.target.value)} className="w-full px-4 py-2 border rounded-xl mb-4" />
                  <div className="flex justify-end space-x-4">
                    <button onClick={() => setShowQuantityModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded-xl">Cancelar</button>
                    <button onClick={() => handleAddToCart(productToAdd, parseInt(quantityToAdd))} disabled={!quantityToAdd || parseInt(quantityToAdd) <= 0} className={`px-4 py-2 text-white font-bold rounded-xl ${(!quantityToAdd || parseInt(quantityToAdd) <= 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'}`}>Añadir</button>
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

      // --- ESTA ES LA SECCIÓN QUE DABA EL ERROR CORREGIDA ---
      // Ahora usa la función formatDate en lugar de cálculos manuales de fecha
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
                  <button onClick={() => handleDownloadAndResetHistory()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">Descargar y Limpiar</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left"></th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Método</th><th className="px-4 py-3 text-left">Total Bs</th><th className="px-4 py-3 text-left">Acción</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSalesHistory.length === 0 ? (<tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No hay ventas recientes.</td></tr>) : (
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
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-16">
      <div className="max-w-7xl mx-auto">{renderPage()}</div>
      {userId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-md">
          <nav className="flex justify-around items-center h-16">
            {['home', 'inventory', 'cart', 'history'].map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`flex-1 flex flex-col items-center justify-center h-full text-sm font-semibold ${currentPage === page ? 'text-blue-600' : 'text-gray-600'}`}>
                    <span className="capitalize">{page === 'home' ? 'Inicio' : page === 'history' ? 'Historial' : page === 'inventory' ? 'Inventario' : 'Carrito'}</span>
                </button>
            ))}
            <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center h-full text-sm font-semibold text-red-600">Salir</button>
          </nav>
        </div>
      )}
      {showGenericModal && <GenericModal title={genericModalTitle} message={genericModalMessage} onClose={() => setShowGenericModal(false)} />}
      {showConfirmModal && <ConfirmModal title={confirmModalTitle} message={confirmModalMessage} onConfirm={() => { onConfirmAction(); setShowConfirmModal(false); }} onCancel={() => setShowConfirmModal(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;