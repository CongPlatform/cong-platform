import type { NextFunction, Request, Response } from "express";

import { createSupabaseAuthClient } from "../config/supabase.js";
import pool from "../config/database.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication token is required",
      code: "AUTH_TOKEN_REQUIRED",
    });

    return;
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    res.status(401).json({
      error: "Authentication token is required",
      code: "AUTH_TOKEN_REQUIRED",
    });

    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    res.status(401).json({
      error: "Invalid or expired authentication token",
      code: "INVALID_AUTH_TOKEN",
    });

    return;
  }

  // Identidade de pesquisa nao pode ser usada se o recurso for desabilitado,
  // a pesquisa terminar ou o registro de vinculo for removido por um reset.
  if(data.user.app_metadata?.cong_study_workspace===true){
    if(process.env.STUDY_WORKSPACES_ENABLED!=='true'){
      res.status(403).json({code:'STUDY_SESSION_EXPIRED',error:'Acesso experimental indisponível'});
      return;
    }
    try{
      const allowed=await pool.query<{allowed:boolean}>(`SELECT EXISTS(
        SELECT 1 FROM public.study_overlay_workspaces w
         JOIN public.study_overlay_participants p ON p.id=w.participant_id
         JOIN public.organizations o ON o.id=w.organization_id
         WHERE w.auth_user_id=$1 AND p.status='active' AND p.session_expires_at>now()
          AND o.active=true) AS allowed`,[data.user.id]);
      if(!allowed.rows[0]?.allowed){
        res.status(403).json({code:'STUDY_SESSION_EXPIRED',error:'Sua sessão de pesquisa terminou'});
        return;
      }
    }catch(nextError){next(nextError);return;}
  }
  res.locals.authUser = data.user;

  res.locals.accessToken = accessToken;

  next();
}
