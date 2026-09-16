-- Run this in Supabase SQL Editor to fix conversation permissions
-- Both owner AND constructor can create conversations

DROP POLICY IF EXISTS "conversations_parties" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = constructor_id);

CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() = constructor_id);

CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = constructor_id);
