use crate::state::{State, hidden_instances};

const LOCAL_USER_ID: &str = "local";

#[tracing::instrument]
pub async fn get_hidden_instance_ids() -> crate::Result<Vec<String>> {
    let state = State::get().await?;
    hidden_instances::get_hidden_instance_ids(LOCAL_USER_ID, &state.pool).await
}

#[tracing::instrument]
pub async fn set_instance_hidden(
    instance_id: &str,
    hidden: bool,
) -> crate::Result<()> {
    let state = State::get().await?;
    hidden_instances::set_instance_hidden(
        LOCAL_USER_ID,
        instance_id,
        hidden,
        &state.pool,
    )
    .await
}
