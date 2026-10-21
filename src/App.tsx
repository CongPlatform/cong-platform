import AppRoutes from "./routes/Routes";
import AccountRestrictionModal from "./components/account/AccountRestrictionModal";

function App() {
  return (
    <>
      <AppRoutes />
      <AccountRestrictionModal />
    </>
  );
}

export default App;
