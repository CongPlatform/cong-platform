import styles from "./CongLoadingState.module.css";

type Props={variant?:"page"|"cards"|"list"|"form"|"inline";count?:number;label?:string};
export default function CongLoadingState({variant="cards",count=3,label="Preparando conteúdo"}:Props){
  return <div className={`${styles.loading} ${styles[variant]}`} role="status" aria-label={label} aria-live="polite" aria-busy="true">
    <span className={styles.srOnly}>{label}</span>
    {variant==="inline"?<span className={styles.pulse} aria-hidden="true"><i/><i/><i/></span>:<>
      {variant==="page"&&<div className={styles.top} aria-hidden="true"><span/><span/></div>}
      <div className={styles.grid} aria-hidden="true">{Array.from({length:Math.min(Math.max(count,1),8)},(_,i)=><div key={i} className={styles.item}><span className={styles.icon}/><span className={styles.line}/><span className={styles.short}/>{variant!=="list"&&<span className={styles.wide}/>}</div>)}</div>
    </>}
  </div>;
}
