-- Run this in Supabase SQL Editor after the main schema.sql

-- Atomically claims an open spot for a waiting list player.
-- Uses FOR UPDATE on the games row to prevent two players claiming simultaneously.
create or replace function claim_spot(p_game_id uuid, p_user_id uuid)
returns boolean as $$
declare
  v_max integer;
  v_current_main integer;
  v_reg_id uuid;
  v_waiting_pos integer;
begin
  -- Lock the game row so concurrent claims are serialised
  select max_players into v_max from public.games where id = p_game_id for update;

  select count(*) into v_current_main
  from public.registrations
  where game_id = p_game_id and list_type = 'main' and is_active = true;

  -- No spot available
  if v_current_main >= v_max then
    return false;
  end if;

  -- Find the user's waiting registration
  select id, position into v_reg_id, v_waiting_pos
  from public.registrations
  where game_id = p_game_id and user_id = p_user_id and list_type = 'waiting' and is_active = true;

  -- User is not on waiting list
  if v_reg_id is null then
    return false;
  end if;

  -- Promote to main list
  update public.registrations
  set list_type = 'main', position = v_current_main + 1
  where id = v_reg_id;

  -- Shift waiting list positions for players behind the one who just claimed
  update public.registrations
  set position = position - 1
  where game_id = p_game_id and list_type = 'waiting' and is_active = true
    and position > v_waiting_pos;

  return true;
end;
$$ language plpgsql security definer;

grant execute on function claim_spot(uuid, uuid) to authenticated;
